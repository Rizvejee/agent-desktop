const ModelClient = require("./modelClient");
const FileSystem = require("./fileSystem");
const Terminal = require("./terminal");
const ProjectContext = require("./projectContext");
const ToolHandler = require("./toolHandler");
const Memory = require("./memory");
const path = require("path");
const fs = require("fs");

// ═══════════════════════════════════════════════════════
// 🎯 TOKEN BUDGET (کل 4000 tokens)
// ═══════════════════════════════════════════════════════
const TOKEN_BUDGET = {
  total: 4000,
  systemPrompt: 500,
  projectInstructions: 300,
  knowledge: 1000,
  chatHistory: 1500,
  userMessage: 700,
};

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const MAX_ITERATIONS = 10;
const MAX_TOOL_OUTPUT = 8000;
const RECENT_MESSAGES = 5;
const MAX_HISTORY_TOKENS = 800;
const MAX_PER_MESSAGE_TOKENS = 200;

class Agent {
  constructor(projectPath, memoryPath) {
    this.modelClient = new ModelClient();
    this.fileSystem = new FileSystem(projectPath);
    this.terminal = new Terminal(projectPath);
    this.projectContext = new ProjectContext(projectPath);
    this.toolHandler = new ToolHandler(projectPath);
    this.memory = new Memory(memoryPath || path.join(__dirname, "../memory"));

    this.toolHandler.setMemory(this.memory);

    this.projectPath = projectPath;
    this.conversationHistory = [];
    this.agentSettings = {};
    this.systemPrompt = this.buildSystemPrompt();
  }

  // ═══════════════════════════════════════════════════════
  // 🧠 SYSTEM PROMPT
  // ✅ نئے Plan Tools کی ہدایات شامل کی گئی ہیں
  // ═══════════════════════════════════════════════════════
  buildSystemPrompt(agentSettings = {}, customInstructions = "") {
    this.agentSettings = agentSettings;
    const name = agentSettings.name || "Coder";
    const role = agentSettings.role || "Personal AI Coding Assistant";
    const language = agentSettings.language || "Urdu";
    const rules = agentSettings.rules || this.getDefaultRules();
    const technologies = agentSettings.technologies || [
      "React", "Next.js", "JavaScript", "HTML", "CSS",
    ];

    const memoryStr = this.memory.getMemoryString();
    const truncatedRules = this.memory.truncateToTokens(rules, 200);
    const truncatedInstructions = customInstructions
      ? this.memory.truncateToTokens(customInstructions, 150)
      : "";

    // ✅ Active Plan کو system prompt میں include کریں (اگر موجود ہو)
    const activePlan = this.memory.getActivePlan();
    const planStr = activePlan ? this.formatPlanForPrompt(activePlan) : "";

    return `You are ${name}, ${role}. Reply in ${language}. Code in ENGLISH. Use JSX + INLINE STYLES.

RULES: ${truncatedRules}
${truncatedInstructions ? `PROJECT: ${truncatedInstructions}` : ""}

WORK MODE:
- BIG tasks: Break into steps, ask before each
- SMALL tasks: Do directly

🚫 NO UNSOLICITED ACTION (بہت اہم!):
If user says "Hello", "Salam", "Hi", or asks a general question, JUST REPLY POLITELY.
Do NOT generate code, do NOT call tools unless a specific coding task is given.

📋 SMART EXECUTION (Context Priority):
1. CHECK MEMORY FIRST: Read the MEMORY section below.
2. CHECK ACTUAL FILES ONCE: Use list_files ONLY ONCE at the start of a task. Do NOT call list_files repeatedly for every step.
3. NEVER duplicate files — if a file exists, read it and modify it.
4. ACTUAL PROJECT FILES ARE THE SOURCE OF TRUTH, not any plan.
5. CONSERVE TOOL CALLS: Each tool call counts. Do not waste iterations on redundant list_files calls.
${planStr ? `\n📋 ACTIVE PLAN (follow this):\n${planStr}\n` : ""}
🚫 NO UNNECESSARY READS: read_file only when user explicitly asks or bug fix needed.
📁 LIST ONCE: list_files only once at start of a task.
🎯 ONE FILE AT A TIME: ❌ write multiple files | ✅ write one file completely

🧠 AUTO-MEMORY: save_to_memory when: user preference, decision made, task completed, bug fixed.
Categories: preferences, projectDecisions, completedTasks, notes.
❌ DO NOT save Project Plan in 'projectDecisions'. Use save_plan tool instead.

📋 PLANNING TOOLS (بہت اہم!):
When user asks to "plan", "break down task", "make roadmap", or "create steps":
1. Use 'save_plan' tool with task_description and steps array → creates active-plan.json file
2. Use 'update_plan_step' tool to mark steps as done/in-progress/pending
3. Use 'get_plan' tool to check current plan status
❌ NEVER write plan steps in chat text without calling save_plan tool!
❌ NEVER save plan in projectDecisions memory category!

🛠️ TOOLS: write_file, read_file, list_files, search_files, delete_file, run_command, save_to_memory, summarize_chat, save_plan, update_plan_step, get_plan.

EXPERTISE: ${technologies.join(", ")}

MEMORY:
${memoryStr}

FINAL CHECK: Did I check memory? Did I check actual files? Am I duplicating? If yes, STOP.`;
  }

  // ✅ Active Plan کو system prompt کے لیے format کریں
  formatPlanForPrompt(plan) {
    if (!plan || !plan.steps) return "";
    const progress = this.memory.getPlanProgress();
    let str = `Task: ${plan.taskDescription || "Untitled"}\n`;
    str += `Progress: ${progress.done}/${progress.total} (${progress.percentage}%)\n`;
    str += `Steps:\n`;
    plan.steps.forEach((step, i) => {
      const icon = step.status === "done" ? "✅" : step.status === "in-progress" ? "⏳" : "⏸️";
      str += `${icon} ${i + 1}. ${step.description || step}\n`;
    });
    return str;
  }

  getDefaultRules() {
    return `Always write clean, readable and reusable code.
Use JSX + INLINE STYLES.
Reply in urdu. Code in ENGLISH.`;
  }

  // ═══════════════════════════════════════════════════════
  // 🔄 REFRESH SYSTEM PROMPT
  // ═══════════════════════════════════════════════════════
  refreshSystemPrompt(customInstructions = "") {
    this.systemPrompt = this.buildSystemPrompt(this.agentSettings, customInstructions);
  }

  // ═══════════════════════════════════════════════════════
  // 📚 SMART KNOWLEDGE RETRIEVAL
  // ═══════════════════════════════════════════════════════
  getSmartKnowledge(userMessage) {
    const index = this.memory.getKnowledgeIndex();
    const entries = Object.entries(index);
    if (entries.length === 0) return "";

    const keywords = userMessage
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    const relevant = entries.filter(([fileName, data]) => {
      const searchText = `${fileName} ${data.summary}`.toLowerCase();
      return keywords.some(word => searchText.includes(word));
    });

    const filesToShow = relevant.length > 0 ? relevant : entries.slice(0, 3);

    let result = "\n═══════════════════════════════════════\n";
    result += "📚 RELEVANT KNOWLEDGE FILES\n";
    result += "═══════════════════════════════════════\n";
    filesToShow.forEach(([fileName, data]) => {
      result += `📄 ${fileName}\n${data.summary}\n`;
    });

    const tokens = this.memory.estimateTokens(result);
    if (tokens > TOKEN_BUDGET.knowledge) {
      result = this.memory.truncateToTokens(result, TOKEN_BUDGET.knowledge);
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════
  // 💬 SMART CHAT HISTORY
  // ═══════════════════════════════════════════════════════
  getSmartHistory() {
    const history = this.conversationHistory;
    if (history.length === 0) return [];

    const truncatedHistory = history.map((msg) => ({
      ...msg,
      content: this.memory.truncateToTokens(msg.content, MAX_PER_MESSAGE_TOKENS),
    }));

    if (truncatedHistory.length > RECENT_MESSAGES) {
      const recent = truncatedHistory.slice(-RECENT_MESSAGES);
      const oldMessages = truncatedHistory.slice(0, -RECENT_MESSAGES);

      const compactSummary = oldMessages
        .filter(m => m.role !== "system")
        .slice(-5)
        .map(m => {
          const role = m.role === "user" ? "You" : "Coder";
          const preview = m.content.slice(0, 60).replace(/\n/g, " ");
          return `${role}: ${preview}...`;
        })
        .join("\n");

      if (compactSummary) {
        const summaryMessage = {
          role: "user",
          content: `[Earlier: ${compactSummary}]`,
        };
        const ackMessage = {
          role: "assistant",
          content: "سمجھ گیا، جاری رکھتے ہیں۔",
        };
        return this.enforceHistoryLimit([summaryMessage, ackMessage, ...recent]);
      }
      return this.enforceHistoryLimit(recent);
    }

    return this.enforceHistoryLimit(truncatedHistory);
  }

  enforceHistoryLimit(history) {
    if (!history || history.length === 0) return [];

    let totalTokens = history.reduce((sum, msg) =>
      sum + this.memory.estimateTokens(msg.content), 0
    );

    if (totalTokens <= MAX_HISTORY_TOKENS) {
      return history;
    }

    console.log(`⚠️ History over limit: ${totalTokens}/${MAX_HISTORY_TOKENS}. Truncating...`);

    const result = [...history];

    while (totalTokens > MAX_HISTORY_TOKENS && result.length > 2) {
      const first = result[0];
      const currentLength = first.content.length;
      const newLength = Math.floor(currentLength / 2);
      if (newLength < 20) {
        result.shift();
      } else {
        result[0] = {
          ...first,
          content: first.content.slice(0, newLength) + "...",
        };
      }
      totalTokens = result.reduce((sum, msg) =>
        sum + this.memory.estimateTokens(msg.content), 0
      );
    }

    if (totalTokens > MAX_HISTORY_TOKENS && result.length > 2) {
      return result.slice(-2).map(msg => ({
        ...msg,
        content: this.memory.truncateToTokens(msg.content, MAX_HISTORY_TOKENS / 2),
      }));
    }

    return result;
  }

  trimHistory() {
    if (this.conversationHistory.length > RECENT_MESSAGES * 2) {
      console.log("💬 History is getting long. Agent should use summarize_chat tool.");
    }
  }

  truncateToolOutput(output) {
    const str = String(output);
    if (str.length <= MAX_TOOL_OUTPUT) return str;
    const half = Math.floor(MAX_TOOL_OUTPUT / 2);
    return (
      str.slice(0, half) +
      `\n... [truncated ${str.length - MAX_TOOL_OUTPUT} characters] ...\n` +
      str.slice(-half)
    );
  }

  // ═══════════════════════════════════════════════════════
  // 💬 MAIN CHAT METHOD
  // ═══════════════════════════════════════════════════════
  async chat(userMessage, onChunk = null, customInstructions = "") {
    this.trimHistory();

    const truncatedUserMessage = this.memory.truncateToTokens(
      userMessage,
      TOKEN_BUDGET.userMessage
    );

    this.conversationHistory.push({
      role: "user",
      content: truncatedUserMessage,
    });

    const knowledgeContext = this.getSmartKnowledge(userMessage);

    if (customInstructions) {
      this.refreshSystemPrompt(customInstructions);
    }

    let smartHistory = this.getSmartHistory();

    const systemTokens = this.memory.estimateTokens(this.systemPrompt);
    let historyTokens = smartHistory.reduce((sum, msg) =>
      sum + this.memory.estimateTokens(msg.content), 0
    );
    const knowledgeTokens = this.memory.estimateTokens(knowledgeContext);
    const userTokens = this.memory.estimateTokens(truncatedUserMessage);

    let totalTokens = systemTokens + historyTokens + knowledgeTokens + userTokens;

    console.log(`\n📊 Token Budget:`);
    console.log(`   System: ${systemTokens}/${TOKEN_BUDGET.systemPrompt}`);
    console.log(`   History: ${historyTokens}/${TOKEN_BUDGET.chatHistory}`);
    console.log(`   Knowledge: ${knowledgeTokens}/${TOKEN_BUDGET.knowledge}`);
    console.log(`   User: ${userTokens}/${TOKEN_BUDGET.userMessage}`);
    console.log(`   Total: ${totalTokens}/${TOKEN_BUDGET.total}`);

    if (totalTokens > TOKEN_BUDGET.total) {
      const excess = totalTokens - TOKEN_BUDGET.total;
      console.log(`⚠️ Over budget by ${excess} tokens. Truncating history...`);
      while (smartHistory.length > 4 && totalTokens > TOKEN_BUDGET.total) {
        smartHistory = smartHistory.slice(2);
        historyTokens = smartHistory.reduce((sum, msg) =>
          sum + this.memory.estimateTokens(msg.content), 0
        );
        totalTokens = systemTokens + historyTokens + knowledgeTokens + userTokens;
      }
    }

    const tools = this.toolHandler.getToolDefinitions();
    const messages = [
      { role: "system", content: this.systemPrompt + knowledgeContext },
      ...smartHistory,
    ];

    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      let response;
      if (onChunk) {
        response = await this.modelClient.sendMessageWithToolsStream(
          messages, tools, onChunk
        );
      } else {
        response = await this.modelClient.sendMessageWithTools(messages, tools);
      }

      if (response.finish_reason === "tool_calls" && response.message.tool_calls) {
        if (onChunk) onChunk(null);

        messages.push({
          role: "assistant",
          content: response.message.content,
          tool_calls: response.message.tool_calls,
        });

        for (const toolCall of response.message.tool_calls) {
          const toolName = toolCall.function.name;
          let toolInput;
          try {
            let args = toolCall.function.arguments;
            if (args.startsWith("```json")) {
              args = args.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
            } else if (args.startsWith("```")) {
              args = args.replace(/^```\n?/, "").replace(/\n?```$/, "").trim();
            }
            toolInput = JSON.parse(args);
          } catch (e) {
            console.error("❌ Failed to parse tool arguments:", toolCall.function.arguments);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error: Invalid JSON in tool arguments. You must provide valid JSON format. Original error: ${e.message}. Please fix your JSON and try again.`,
            });
            continue;
          }

          const toolResult = await this.toolHandler.executeTool(toolName, toolInput);
          const truncatedResult = this.truncateToolOutput(toolResult);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: truncatedResult,
          });

          // ✅ جب plan/memory/knowledge tool call ہو تو system prompt refresh کریں
          if (toolName === "save_to_memory" ||
              toolName === "index_knowledge_file" ||
              toolName === "summarize_chat" ||
              toolName === "save_plan" ||
              toolName === "update_plan_step") {
            this.refreshSystemPrompt(customInstructions);
            messages[0] = {
              ...messages[0],
              content: this.systemPrompt + this.getSmartKnowledge(userMessage),
            };
          }
        }
        continue;
      }

      const finalResponse = response.message.content;
      this.conversationHistory.push({
        role: "assistant",
        content: finalResponse,
      });
      this.trimHistory();
      return finalResponse;
    }

    return "⚠️ زیادہ tool calls ہو گئی ہیں۔ براہ کرم اپنا request چھوٹے حصوں میں تقسیم کریں۔";
  }

  // ═══════════════════════════════════════════════════════
  // 🎯 COMMAND HANDLER
  // ═══════════════════════════════════════════════════════
  async handleCommand(input) {
    const parts = input.trim().split(" ");
    const command = parts[0];

    switch (command) {
      case "/list":
        return this.fileSystem.listFiles(parts[1] || "");
      case "/read":
        if (!parts[1]) return "❌ Usage: /read src/App.js";
        return this.fileSystem.readFile(parts[1]);
      case "/create":
        if (!parts[1]) return "❌ Usage: /create src/Button.js";
        return this.fileSystem.createFile(parts[1]);
      case "/delete":
        if (!parts[1]) return "❌ Usage: /delete src/Button.js";
        return this.fileSystem.deleteFile(parts[1]);
      case "/search":
        if (!parts[1]) return "❌ Usage: /search Button";
        return this.fileSystem.searchFiles(parts[1]);
      case "/run": {
        if (!parts[1]) return "❌ Usage: /run npm install";
        const cmd = parts.slice(1).join(" ");
        const result = await this.terminal.run(cmd);
        return result.output;
      }
      case "/context":
        return this.projectContext.getContextString();
      case "/refresh":
        this.projectContext.context = null;
        this.refreshSystemPrompt();
        return "✅ Project context اور memory refresh ہو گئی";

      // ─── Memory Commands ───────────────────────────
      case "/remember": {
        if (parts.length < 3) {
          return `❌ Usage: /remember [category] [text]\nCategories: preferences, projectDecisions, completedTasks, notes\nExample: /remember preferences "Always use functional components"`;
        }
        const category = parts[1];
        let item = parts.slice(2).join(" ");
        if ((item.startsWith('"') && item.endsWith('"')) ||
            (item.startsWith("'") && item.endsWith("'"))) {
          item = item.slice(1, -1);
        }
        const result = this.memory.remember(category, item);
        this.refreshSystemPrompt();
        return result;
      }
      case "/forget": {
        if (parts.length < 3) return "❌ Usage: /forget [category] [text]";
        const category = parts[1];
        const item = parts.slice(2).join(" ");
        const result = this.memory.forget(category, item);
        this.refreshSystemPrompt();
        return result;
      }
      case "/memory":
        return this.memory.getMemoryString();
      case "/memory-clear":
        return this.memory.clearAll();

      // ─── Knowledge Index Commands ──────────────────
      case "/knowledge-index": {
        const index = this.memory.getKnowledgeIndex();
        const entries = Object.entries(index);
        if (entries.length === 0) {
          return "ℹ️ کوئی knowledge files indexed نہیں ہیں۔";
        }
        let text = `📚 KNOWLEDGE INDEX (${entries.length} files)\n`;
        entries.forEach(([fileName, data]) => {
          text += `📄 ${fileName}\n`;
          text += `   ${data.summary}\n`;
          text += `   Added: ${new Date(data.addedAt).toLocaleDateString()}\n`;
        });
        return text;
      }
      case "/knowledge-clear": {
        const index = this.memory.getKnowledgeIndex();
        Object.keys(index).forEach(fileName => {
          this.memory.removeKnowledgeIndex(fileName);
        });
        return "✅ Knowledge index clear ہو گیا";
      }

      // ─── Chat Summary Commands ─────────────────────
      case "/chat-summary": {
        const summary = this.memory.getChatSummary();
        if (!summary.olderMessages) {
          return "ℹ️ کوئی chat summary نہیں ہے۔";
        }
        return `💬 CHAT SUMMARY\n` +
          `Messages summarized: ${summary.messageCount}\n` +
          `Last updated: ${summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString() : "N/A"}\n` +
          `Summary:\n${summary.olderMessages}`;
      }
      case "/chat-summary-clear":
        this.memory.clearChatSummary();
        return "✅ Chat summary clear ہو گیا";

      // ─── Token Budget Info ─────────────────────────
      case "/budget": {
        return `📊 TOKEN BUDGET\n` +
          `Total: ${TOKEN_BUDGET.total} tokens\n` +
          `Allocations:\n` +
          `  System Prompt: ${TOKEN_BUDGET.systemPrompt}\n` +
          `  Project Instructions: ${TOKEN_BUDGET.projectInstructions}\n` +
          `  Knowledge: ${TOKEN_BUDGET.knowledge}\n` +
          `  Chat History: ${TOKEN_BUDGET.chatHistory}\n` +
          `  User Message: ${TOKEN_BUDGET.userMessage}\n` +
          `Current usage:\n` +
          `  System: ${this.memory.estimateTokens(this.systemPrompt)}\n` +
          `  History: ${this.conversationHistory.reduce((sum, msg) =>
            sum + this.memory.estimateTokens(msg.content), 0)}\n` +
          `  Knowledge files: ${Object.keys(this.memory.getKnowledgeIndex()).length}`;
      }

      // ─── Plan Commands (✅ active-plan.json سے پڑھیں گے) ─────
      case "/plan": {
        const plan = this.memory.getActivePlan();
        if (!plan) {
          return "ℹ️ کوئی active plan نہیں ہے۔";
        }
        let text = "📋 ACTIVE PLAN (from active-plan.json)\n";
        text += `Task: ${plan.taskDescription || "Untitled"}\n`;
        text += `Created: ${new Date(plan.createdAt).toLocaleDateString()}\n`;
        text += `Total Steps: ${plan.totalSteps}\n\n`;
        plan.steps.forEach((step, i) => {
          const icon = step.status === "done" ? "✅" : step.status === "in-progress" ? "⏳" : "⏸️";
          text += `${icon} ${i + 1}. ${step.description}\n`;
        });
        const progress = this.memory.getPlanProgress();
        text += `\n📊 Progress: ${progress.done}/${progress.total} (${progress.percentage}%)\n`;
        return text;
      }
      case "/status": {
        const plan = this.memory.getActivePlan();
        if (!plan) return "ℹ️ کوئی active plan نہیں ہے۔";
        const progress = this.memory.getPlanProgress();
        return `📊 STATUS\n` +
          `Task: ${plan.taskDescription || "Untitled"}\n` +
          `Total steps: ${progress.total}\n` +
          `Completed: ${progress.done}\n` +
          `In Progress: ${progress.inProgress}\n` +
          `Pending: ${progress.pending}\n` +
          `Progress: ${progress.percentage}%`;
      }
      case "/reset-plan": {
        this.memory.clearActivePlan();
        this.refreshSystemPrompt();
        return "✅ Plan cleared";
      }

      // ─── Help ─────────────────────────────────────
      case "/help":
        return `📖 Available Commands:

📁 FILE COMMANDS:
/list [path]                - List files
/read [path]                - Read a file
/create [path]              - Create a new file
/delete [path]              - Delete a file
/search [term]              - Search files
/run [command]              - Run terminal command

🧠 MEMORY COMMANDS:
/remember [category] [text] - Save to memory
/forget [category] [text]   - Remove from memory
/memory                     - Show all memory
/memory-clear               - Clear all memory

📚 KNOWLEDGE COMMANDS:
/knowledge-index            - Show indexed files
/knowledge-clear            - Clear knowledge index

💬 CHAT COMMANDS:
/chat-summary               - Show chat summary
/chat-summary-clear         - Clear chat summary

📊 BUDGET COMMAND:
/budget                     - Show token budget usage

📋 PLAN COMMANDS:
/plan                       - Show active plan (from active-plan.json)
/status                     - Show progress
/reset-plan                 - Clear active plan

🔧 OTHER:
/context                    - Show project context
/refresh                    - Refresh context & memory
/clear                      - Clear chat history
/help                       - Show this help

Memory categories:
preferences       - How you like things done
projectDecisions  - Important project decisions
completedTasks    - What has been built
notes             - General notes

Note: Active Plan is stored in active-plan.json (separate from memory).`;

      case "/clear":
        this.conversationHistory = [];
        this.memory.clearChatSummary();
        return "✅ Chat history اور summary clear ہو گئی";

      default:
        return null;
    }
  }
}

module.exports = Agent;
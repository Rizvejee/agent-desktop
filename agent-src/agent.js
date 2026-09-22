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
const MAX_ITERATIONS = 15;        // ایک message میں زیادہ سے زیادہ tool calls
const RECENT_MESSAGES = 10;       // آخری 10 messages پورے رکھیں
const MAX_TOOL_OUTPUT = 8000;     // Tool result کی زیادہ سے زیادہ لمبائی

class Agent {
  constructor(projectPath, memoryPath) {
    this.modelClient = new ModelClient();
    this.fileSystem = new FileSystem(projectPath);
    this.terminal = new Terminal(projectPath);
    this.projectContext = new ProjectContext(projectPath);
    this.toolHandler = new ToolHandler(projectPath);
    this.memory = new Memory(memoryPath || path.join(__dirname, "../memory"));

    // ✅ ToolHandler کو memory کا reference دیں
    this.toolHandler.setMemory(this.memory);

    this.projectPath = projectPath;
    this.conversationHistory = [];
    this.agentSettings = {};
    this.systemPrompt = this.buildSystemPrompt();
  }

  // ═══════════════════════════════════════════════════════
  // 🧠 SYSTEM PROMPT (Token budget کے ساتھ)
  // ═══════════════════════════════════════════════════════
  buildSystemPrompt(agentSettings = {}, customInstructions = "") {
    this.agentSettings = agentSettings;

    const name = agentSettings.name || "Coder";
    const role = agentSettings.role || "Personal AI Coding Assistant";
    const language = agentSettings.language || "Urdu";
    const rules = agentSettings.rules || this.getDefaultRules();
    const technologies = agentSettings.technologies || [
      "React", "React Native", "Next.js", "Expo",
      "JavaScript", "HTML", "CSS",
    ];

    // ✅ Memory سے مختصر info
    const memoryStr = this.memory.getMemoryString();

    // ✅ Token budget کے مطابق truncate کریں
    const truncatedRules = this.memory.truncateToTokens(
      rules,
      TOKEN_BUDGET.systemPrompt - 200  // باقی name, role, language کے لیے
    );

    const truncatedInstructions = this.memory.truncateToTokens(
      customInstructions,
      TOKEN_BUDGET.projectInstructions
    );

    return `You are ${name}, a ${role}.

LANGUAGE: Reply in ${language} ONLY. Code in ENGLISH.
STYLE: Use JSX + INLINE STYLES only. No separate CSS.

RULES:
${truncatedRules}

${truncatedInstructions ? `PROJECT INSTRUCTIONS:\n${truncatedInstructions}\n` : ""}
═══════════════════════════════════════════════════
🎯 SMART WORK MODE
═══════════════════════════════════════════════════
- BIG tasks (login system, dashboard): Break into steps, ask before each
- SMALL tasks (delete file, change color): Do directly, no need to ask

═══════════════════════════════════════════════════
🧠 AUTO-MEMORY (خود سے یاد رکھو!)
═══════════════════════════════════════════════════
Use save_to_memory tool AUTOMATICALLY when:
✅ User states a preference
✅ Important project decision is made
✅ Significant task is completed
✅ User gives a rule/instruction
✅ A bug is fixed

DO NOT save trivial things.
Categories: preferences, projectDecisions, completedTasks, notes

═══════════════════════════════════════════════════
📚 KNOWLEDGE FILES (بہت اہم!)
═══════════════════════════════════════════════════
When you see "--- FILE: filename.txt ---" in the message:
1. Read the file carefully
2. Use index_knowledge_file tool to save a 100-word summary
3. If it's a plan, break into steps and save_to_memory each step
4. Tell user: "میں نے plan پڑھ لیا ہے اور memory میں save کر لیا ہے"

For future messages:
- Use search_knowledge tool to find relevant files
- Don't ask user to re-send files

═══════════════════════════════════════════════════
💬 CHAT HISTORY MANAGEMENT
═══════════════════════════════════════════════════
When conversation gets long (more than 10 messages):
- Use summarize_chat tool to save older messages as 2-3 line summary
- This saves tokens for important context

═══════════════════════════════════════════════════
🛠️ AVAILABLE TOOLS
═══════════════════════════════════════════════════
- read_file, write_file, list_files, search_files, delete_file
- run_command (npm, node, yarn, pnpm)
- save_to_memory (auto-save important info)
- index_knowledge_file (save knowledge file summary)
- search_knowledge (find relevant files)
- summarize_chat (summarize old messages)

EXPERTISE: ${technologies.join(", ")}

═══════════════════════════════════════════════════
📋 MEMORY (یاد رکھنے کی چیزیں)
═══════════════════════════════════════════════════
${memoryStr}
`;
  }

  getDefaultRules() {
    return `Always write clean, readable and reusable code.
Follow DRY principles and existing project architecture.
Always create JSX files for components & pages with everything inline.
Use English everywhere in the project code.
Do not add unnecessary dependencies.
Keep explanations concise.`;
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

  /**
   * User message کے مطابق relevant knowledge files ڈھونڈیں
   */
  getSmartKnowledge(userMessage) {
    const index = this.memory.getKnowledgeIndex();
    const entries = Object.entries(index);

    if (entries.length === 0) return "";

    // User message سے keywords نکالیں
    const keywords = userMessage
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Relevant files ڈھونڈیں
    const relevant = entries.filter(([fileName, data]) => {
      const searchText = `${fileName} ${data.summary}`.toLowerCase();
      return keywords.some(word => searchText.includes(word));
    });

    // اگر کوئی relevant نہ ملے تو سب files کی summaries دکھائیں
    const filesToShow = relevant.length > 0 ? relevant : entries.slice(0, 3);

    let result = "\n═══════════════════════════════════════\n";
    result += "📚 RELEVANT KNOWLEDGE FILES\n";
    result += "═══════════════════════════════════════\n\n";

    filesToShow.forEach(([fileName, data]) => {
      result += `📄 ${fileName}\n   ${data.summary}\n\n`;
    });

    // Token budget check
    const tokens = this.memory.estimateTokens(result);
    if (tokens > TOKEN_BUDGET.knowledge) {
      result = this.memory.truncateToTokens(result, TOKEN_BUDGET.knowledge);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════
  // 💬 SMART CHAT HISTORY
  // ═══════════════════════════════════════════════════════

  /**
   * آخری 10 messages + پرانی کا summary
   */
  getSmartHistory() {
    const history = this.conversationHistory;

    if (history.length <= RECENT_MESSAGES) {
      return history;
    }

    // آخری 10 messages
    const recent = history.slice(-RECENT_MESSAGES);

    // پرانی messages کا summary (memory سے)
    const summary = this.memory.getChatSummaryString();

    if (!summary) {
      // اگر summary نہیں ہے تو صرف recent messages
      return recent;
    }

    // Summary کو system-like message کے طور پر add کریں
    return [
      {
        role: "user",
        content: `[Earlier conversation summary]\n${summary}`,
      },
      {
        role: "assistant",
        content: "میں نے پچھلی بات چیت کا خلاصہ پڑھ لیا ہے۔ ہم جاری رکھ سکتے ہیں۔",
      },
      ...recent,
    ];
  }

  // ═══════════════════════════════════════════════════════
  // 📏 TRIM CONVERSATION HISTORY
  // ═══════════════════════════════════════════════════════
  trimHistory() {
    // اگر history بہت لمبی ہو جائے تو auto-summarize کا reminder
    if (this.conversationHistory.length > RECENT_MESSAGES * 2) {
      console.log("💬 History is getting long. Agent should use summarize_chat tool.");
    }
  }

  // ═══════════════════════════════════════════════════════
  // 📏 TRUNCATE LONG TOOL OUTPUTS
  // ═══════════════════════════════════════════════════════
  truncateToolOutput(output) {
    const str = String(output);
    if (str.length <= MAX_TOOL_OUTPUT) return str;

    const half = Math.floor(MAX_TOOL_OUTPUT / 2);
    return (
      str.slice(0, half) +
      `\n\n... [truncated ${str.length - MAX_TOOL_OUTPUT} characters] ...\n\n` +
      str.slice(-half)
    );
  }

  // ═══════════════════════════════════════════════════════
  // 💬 MAIN CHAT METHOD
  // ═══════════════════════════════════════════════════════
  async chat(userMessage, onChunk = null, customInstructions = "") {
    this.trimHistory();

    // ✅ User message کو token budget کے مطابق truncate کریں
    const truncatedUserMessage = this.memory.truncateToTokens(
      userMessage,
      TOKEN_BUDGET.userMessage
    );

    this.conversationHistory.push({
      role: "user",
      content: truncatedUserMessage,
    });

    // ✅ Smart knowledge retrieval
    const knowledgeContext = this.getSmartKnowledge(userMessage);

    // ✅ System prompt refresh (memory changes کے ساتھ)
    if (customInstructions) {
      this.refreshSystemPrompt(customInstructions);
    }

    // ✅ Smart history
    const smartHistory = this.getSmartHistory();

    // ✅ Token budget check
    const systemTokens = this.memory.estimateTokens(this.systemPrompt);
    const historyTokens = smartHistory.reduce((sum, msg) =>
      sum + this.memory.estimateTokens(msg.content), 0
    );
    const knowledgeTokens = this.memory.estimateTokens(knowledgeContext);
    const userTokens = this.memory.estimateTokens(truncatedUserMessage);

    const totalTokens = systemTokens + historyTokens + knowledgeTokens + userTokens;

    console.log(`\n📊 Token Budget:`);
    console.log(`   System: ${systemTokens}/${TOKEN_BUDGET.systemPrompt}`);
    console.log(`   History: ${historyTokens}/${TOKEN_BUDGET.chatHistory}`);
    console.log(`   Knowledge: ${knowledgeTokens}/${TOKEN_BUDGET.knowledge}`);
    console.log(`   User: ${userTokens}/${TOKEN_BUDGET.userMessage}`);
    console.log(`   Total: ${totalTokens}/${TOKEN_BUDGET.total}`);

    // اگر total budget سے زیادہ ہو تو history truncate کریں
    let finalHistory = smartHistory;
    if (totalTokens > TOKEN_BUDGET.total) {
      const excess = totalTokens - TOKEN_BUDGET.total;
      console.log(`⚠️ Over budget by ${excess} tokens. Truncating history...`);

      // History کو progressively truncate کریں
      while (finalHistory.length > 4 && totalTokens > TOKEN_BUDGET.total) {
        finalHistory = finalHistory.slice(2); // پہلے 2 messages ہٹائیں
        totalTokens = finalHistory.reduce((sum, msg) =>
          sum + this.memory.estimateTokens(msg.content), 0
        ) + systemTokens + knowledgeTokens + userTokens;
      }
    }

    const tools = this.toolHandler.getToolDefinitions();
    let messages = [
      { role: "system", content: this.systemPrompt + knowledgeContext },
      ...finalHistory,
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

      // ✅ Tool calls handling
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
            toolInput = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            toolInput = {};
          }

          const toolResult = await this.toolHandler.executeTool(toolName, toolInput);
          const truncatedResult = this.truncateToolOutput(toolResult);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: truncatedResult,
          });

          // ✅ اگر memory save ہوئی تو system prompt refresh کریں
          if (toolName === "save_to_memory" ||
              toolName === "index_knowledge_file" ||
              toolName === "summarize_chat") {
            this.refreshSystemPrompt(customInstructions);
            // Messages میں system prompt update کریں
            messages[0].content = this.systemPrompt + this.getSmartKnowledge(userMessage);
          }
        }
        continue;
      }

      // ✅ Final response
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
          return `❌ Usage: /remember [category] [text]
Categories: preferences, projectDecisions, completedTasks, notes
Example: /remember preferences "Always use functional components"`;
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

      // ─── Knowledge Index Commands (نئے!) ───────────
      case "/knowledge-index": {
        const index = this.memory.getKnowledgeIndex();
        const entries = Object.entries(index);

        if (entries.length === 0) {
          return "ℹ️ کوئی knowledge files indexed نہیں ہیں۔";
        }

        let text = `📚 KNOWLEDGE INDEX (${entries.length} files)\n\n`;
        entries.forEach(([fileName, data]) => {
          text += `📄 ${fileName}\n`;
          text += `   ${data.summary}\n`;
          text += `   Added: ${new Date(data.addedAt).toLocaleDateString()}\n\n`;
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

      // ─── Chat Summary Commands (نئے!) ─────────────
      case "/chat-summary": {
        const summary = this.memory.getChatSummary();

        if (!summary.olderMessages) {
          return "ℹ️ کوئی chat summary نہیں ہے۔";
        }

        return `💬 CHAT SUMMARY\n\n` +
               `Messages summarized: ${summary.messageCount}\n` +
               `Last updated: ${summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString() : "N/A"}\n\n` +
               `Summary:\n${summary.olderMessages}`;
      }

      case "/chat-summary-clear":
        this.memory.clearChatSummary();
        return "✅ Chat summary clear ہو گیا";

      // ─── Token Budget Info (نیا!) ─────────────────
      case "/budget": {
        return `📊 TOKEN BUDGET\n\n` +
               `Total: ${TOKEN_BUDGET.total} tokens\n\n` +
               `Allocations:\n` +
               `  System Prompt: ${TOKEN_BUDGET.systemPrompt}\n` +
               `  Project Instructions: ${TOKEN_BUDGET.projectInstructions}\n` +
               `  Knowledge: ${TOKEN_BUDGET.knowledge}\n` +
               `  Chat History: ${TOKEN_BUDGET.chatHistory}\n` +
               `  User Message: ${TOKEN_BUDGET.userMessage}\n\n` +
               `Current usage:\n` +
               `  System: ${this.memory.estimateTokens(this.systemPrompt)}\n` +
               `  History: ${this.conversationHistory.reduce((sum, msg) =>
                 sum + this.memory.estimateTokens(msg.content), 0)}\n` +
               `  Knowledge files: ${Object.keys(this.memory.getKnowledgeIndex()).length}`;
      }

      // ─── Plan Commands ─────────────────────────────
      case "/plan": {
        const data = this.memory.getAll();
        if (!data.projectDecisions || data.projectDecisions.length === 0) {
          return "ℹ️ کوئی active plan نہیں ہے۔";
        }

        let text = "📋 ACTIVE PLAN\n\n";
        text += `Total Steps: ${data.projectDecisions.length}\n\n`;

        data.projectDecisions.forEach((d, i) => {
          text += `${i + 1}. ${d}\n`;
        });

        if (data.completedTasks && data.completedTasks.length > 0) {
          text += "\n✅ COMPLETED:\n";
          data.completedTasks.forEach((t) => {
            text += `  • ${t}\n`;
          });
        }

        return text;
      }

      case "/status": {
        const data = this.memory.getAll();
        const total = data.projectDecisions?.length || 0;
        const done = data.completedTasks?.length || 0;

        if (total === 0) return "ℹ️ کوئی active plan نہیں ہے۔";

        const percent = Math.round((done / total) * 100);
        return `📊 STATUS\n` +
               `Total steps: ${total}\n` +
               `Completed: ${done}\n` +
               `Progress: ${percent}%`;
      }

      case "/reset-plan": {
        const data = this.memory.getAll();
        data.projectDecisions = [];
        data.completedTasks = [];
        this.memory.saveMemory();
        this.refreshSystemPrompt();
        return "✅ Plan clear ہو گیا";
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

📚 KNOWLEDGE COMMANDS (نئے!):
  /knowledge-index            - Show indexed files
  /knowledge-clear            - Clear knowledge index

💬 CHAT COMMANDS (نئے!):
  /chat-summary               - Show chat summary
  /chat-summary-clear         - Clear chat summary

📊 BUDGET COMMAND (نیا!):
  /budget                     - Show token budget usage

📋 PLAN COMMANDS:
  /plan                       - Show active plan
  /status                     - Show progress
  /reset-plan                 - Clear active plan

🔧 OTHER:
  /context                    - Show project context
  /refresh                    - Refresh context & memory
  /clear                      - Clear chat history
  /help                       - Show this help

Memory categories:
  preferences       - How you like things done
  projectDecisions  - Important project decisions / plan steps
  completedTasks    - What has been built
  notes             - General notes`;

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

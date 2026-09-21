const ModelClient = require("./modelClient");
const FileSystem = require("./fileSystem");
const Terminal = require("./terminal");
const ProjectContext = require("./projectContext");
const ToolHandler = require("./toolHandler");
const Memory = require("./memory");
const path = require("path");
const fs = require("fs");

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const MAX_ITERATIONS = 15;        // ایک message میں زیادہ سے زیادہ tool calls
const MAX_HISTORY = 20;           // conversation history کی حد
const MAX_FILE_SIZE = 50000;      // 50KB — بڑی files truncate ہوں گی
const MAX_TOOL_OUTPUT = 8000;     // Tool result کی زیادہ سے زیادہ لمبائی

class Agent {
  constructor(projectPath, memoryPath) {
    this.modelClient = new ModelClient();
    this.fileSystem = new FileSystem(projectPath);
    this.terminal = new Terminal(projectPath);
    this.projectContext = new ProjectContext(projectPath);
    this.toolHandler = new ToolHandler(projectPath);
    this.memory = new Memory(memoryPath || path.join(__dirname, "../memory"));
    this.projectPath = projectPath;
    this.conversationHistory = [];
    this.agentSettings = {};
    this.systemPrompt = this.buildSystemPrompt();
  }

  // ═══════════════════════════════════════════════════════
  // SYSTEM PROMPT (اردو + English code rules)
  // ═══════════════════════════════════════════════════════
  buildSystemPrompt(agentSettings = {}) {
    this.agentSettings = agentSettings;

    const name = agentSettings.name || "Coder";
    const role = agentSettings.role || "Personal AI Coding Assistant";
    const language = agentSettings.language || "Urdu";
    const rules = agentSettings.rules || this.getDefaultRules();
    const technologies = agentSettings.technologies || [
      "React", "React Native", "Next.js", "Expo",
      "JavaScript", "HTML", "CSS",
    ];

    const context = this.projectContext.getContextString();
    const memoryStr = this.memory.getCompactMemoryString(); // ✅ Token-efficient
    const planSummary = this.getPlanSummaryForPrompt();

    return `You are ${name}, a ${role}.

═══════════════════════════════════════════════════
🗣️ LANGUAGE RULES (بہت اہم!)
═══════════════════════════════════════════════════
- You MUST communicate with the user in ${language} ONLY.
- But ALL code, variable names, function names, component names,
  button labels, UI text, comments in code — EVERYTHING must be in ENGLISH.
- Example: User says "مجھے ایک login page بنا کر دو"
  → You reply in Urdu explaining what you'll do
  → But the code you write has English names: LoginPage.jsx, handleLogin(), etc.

═══════════════════════════════════════════════════
🎨 CODING STYLE (صارف کی ترجیحات)
═══════════════════════════════════════════════════
${rules}

ALWAYS follow these coding preferences:
1. Use JSX components and pages
2. Use INLINE STYLES only — NO separate .css files
3. All styling should be inside the component file using style={{...}}
4. Keep components clean and readable
5. Use English for ALL code identifiers

═══════════════════════════════════════════════════
🎯 STEP-BY-STEP WORK MODE (سب سے اہم!)
═══════════════════════════════════════════════════
CRITICAL RULE — You MUST follow this strictly:

1. NEVER do everything at once. Break EVERY task into small steps.
2. Before starting ANY work, FIRST tell the user:
   - What you understood
   - How many steps you will take
   - What each step will do
   - Ask: "کیا میں پہلا step شروع کروں؟"
3. Wait for user's confirmation (ہاں / اگلا / start)
4. Do ONLY ONE step at a time
5. After completing a step, tell the user:
   - What you did
   - Which files were created/modified
   - What the next step is
   - Ask: "کیا اگلا step شروع کروں؟"
6. NEVER proceed without user's confirmation.

If user uploads a .txt file as a plan:
- Read it carefully
- Break it into numbered steps automatically
- Save the plan to memory
- Start from step 1 AFTER asking user

═══════════════════════════════════════════════════
🛠️ AVAILABLE TOOLS
═══════════════════════════════════════════════════
You have access to these tools:
- read_file: Read a file from the project
- write_file: Write/update a file
- list_files: List files in a directory
- search_files: Search files by name
- delete_file: Delete a file
- run_command: Run terminal commands (npm, node, etc.)

When using tools:
1. First use list_files or read_file to understand the project
2. Then write the code using write_file tool
3. Finally explain what you did in ${language}

═══════════════════════════════════════════════════
🧠 MEMORY (یاد رکھنے کی چیزیں)
═══════════════════════════════════════════════════
${memoryStr}

═══════════════════════════════════════════════════
📋 ACTIVE PLAN (اگر کوئی plan جاری ہے)
═══════════════════════════════════════════════════
${planSummary}

═══════════════════════════════════════════════════
💻 PROJECT CONTEXT
═══════════════════════════════════════════════════
${context}

═══════════════════════════════════════════════════
🎓 EXPERTISE
═══════════════════════════════════════════════════
You are an expert in: ${technologies.join(", ")}

Remember:
- Reply in ${language}
- Write code in ENGLISH
- Use INLINE STYLES (no separate CSS files)
- Work STEP BY STEP, ask before each step
- Save important things to memory using /remember
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
  // PLAN SUMMARY FOR PROMPT (Token-efficient)
  // ═══════════════════════════════════════════════════════
  getPlanSummaryForPrompt() {
    const plan = this.memory.loadPlan();
    if (!plan) return "No active plan. Waiting for user's task.";

    const summary = this.memory.getPlanSummary();
    let text = `Task: ${summary.taskDescription}\n`;
    text += `Progress: ${summary.completed}/${summary.totalSteps} steps (${summary.percentComplete}%)\n`;

    if (summary.nextStep) {
      text += `Current: Step ${summary.nextStep.id} - ${summary.nextStep.description}\n`;
      text += `Status: ${summary.nextStep.status}\n`;
    }

    // Show last 3 completed steps
    const doneSteps = plan.steps.filter(s => s.status === "done").slice(-3);
    if (doneSteps.length > 0) {
      text += `Recently completed:\n`;
      doneSteps.forEach(s => {
        text += `  ✅ Step ${s.id}: ${s.description}\n`;
      });
    }

    return text;
  }

  // ═══════════════════════════════════════════════════════
  // REFRESH SYSTEM PROMPT
  // ═══════════════════════════════════════════════════════
  refreshSystemPrompt() {
    this.systemPrompt = this.buildSystemPrompt(this.agentSettings);
  }

  // ═══════════════════════════════════════════════════════
  // TRIM CONVERSATION HISTORY (Token management)
  // ═══════════════════════════════════════════════════════
  trimHistory() {
    if (this.conversationHistory.length > MAX_HISTORY) {
      // پہلا user message رکھیں (context کے لیے)
      const firstUserMsg = this.conversationHistory.find(m => m.role === "user");
      const recent = this.conversationHistory.slice(-MAX_HISTORY);

      this.conversationHistory = firstUserMsg && !recent.includes(firstUserMsg)
        ? [firstUserMsg, ...recent]
        : recent;
    }
  }

  // ═══════════════════════════════════════════════════════
  // TRUNCATE LONG TOOL OUTPUTS (Token management)
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
  // DETECT .TXT FILE UPLOAD
  // ═══════════════════════════════════════════════════════
  detectPlanFile(message) {
    // Check if message contains attached .txt file content
    const txtFilePattern = /---\s*([\w\-\.]+\.txt)\s*---\s*\n([\s\S]*?)(?=\n---|\nAttached files:|$)/g;
    const matches = [];
    let match;

    while ((match = txtFilePattern.exec(message)) !== null) {
      matches.push({
        fileName: match[1],
        content: match[2].trim()
      });
    }

    return matches;
  }

  // ═══════════════════════════════════════════════════════
  // SAVE KNOWLEDGE FILE TO MEMORY
  // ═══════════════════════════════════════════════════════
  async saveKnowledgeToMemory(fileName, content) {
    // Generate a brief summary (first 200 chars + key points)
    const summary = content.slice(0, 200).replace(/\n/g, " ").trim() +
                   (content.length > 200 ? "..." : "");

    // Extract key points (lines starting with - or • or numbers)
    const keyPoints = content
      .split("\n")
      .filter(line => /^[\s]*[-•\d]/.test(line))
      .slice(0, 10)
      .map(line => line.trim());

    this.memory.addKnowledgeFile(fileName, summary, keyPoints);

    // Also save to project's knowledge folder
    const knowledgeDir = path.join(this.memory.memoryPath, "knowledge");
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const filePath = path.join(knowledgeDir, `${fileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify({
      name: fileName,
      content: content,
      addedAt: new Date().toISOString()
    }, null, 2), "utf-8");

    return { fileName, summary, keyPoints };
  }

  // ═══════════════════════════════════════════════════════
  // MAIN CHAT METHOD
  // ═══════════════════════════════════════════════════════
  async chat(userMessage, onChunk = null) {
    // ✅ Trim history before adding new message
    this.trimHistory();

    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Check for .txt plan files
    const planFiles = this.detectPlanFile(userMessage);
    if (planFiles.length > 0) {
      for (const pf of planFiles) {
        await this.saveKnowledgeToMemory(pf.fileName, pf.content);
      }
    }

    const tools = this.toolHandler.getToolDefinitions();
    let messages = [
      { role: "system", content: this.systemPrompt },
      ...this.conversationHistory,
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

          // ✅ Truncate long outputs
          const truncatedResult = this.truncateToolOutput(toolResult);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: truncatedResult,
          });
        }
        continue;
      }

      // ✅ Final response
      const finalResponse = response.message.content;
      this.conversationHistory.push({
        role: "assistant",
        content: finalResponse,
      });

      // ✅ Trim again after response
      this.trimHistory();

      return finalResponse;
    }

    // ✅ Max iterations reached
    return "⚠️ زیادہ tool calls ہو گئی ہیں۔ براہ کرم اپنا request چھوٹے حصوں میں تقسیم کریں۔";
  }

  // ═══════════════════════════════════════════════════════
  // COMMAND HANDLER
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
        // Remove surrounding quotes
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

      // ─── Plan Commands (نئے!) ──────────────────────
      case "/plan": {
        const plan = this.memory.loadPlan();
        if (!plan) return "ℹ️ کوئی active plan نہیں ہے۔";

        const summary = this.memory.getPlanSummary();
        let text = `📋 ACTIVE PLAN\n`;
        text += `Task: ${summary.taskDescription}\n`;
        text += `Progress: ${summary.completed}/${summary.totalSteps} (${summary.percentComplete}%)\n\n`;
        text += `STEPS:\n`;

        plan.steps.forEach(s => {
          const icon = s.status === "done" ? "✅" :
                      s.status === "in-progress" ? "🔄" :
                      s.status === "skipped" ? "⏭️" : "⬜";
          text += `${icon} Step ${s.id}: ${s.description} [${s.status}]\n`;
        });

        return text;
      }

      case "/status": {
        const summary = this.memory.getPlanSummary();
        if (!summary) return "ℹ️ کوئی active plan نہیں ہے۔";

        return `📊 STATUS\n` +
               `Task: ${summary.taskDescription}\n` +
               `Completed: ${summary.completed}/${summary.totalSteps}\n` +
               `Progress: ${summary.percentComplete}%\n` +
               (summary.nextStep ? `Next: Step ${summary.nextStep.id} - ${summary.nextStep.description}` : "✅ All steps complete!");
      }

      case "/reset-plan":
        this.memory.clearPlan();
        this.refreshSystemPrompt();
        return "✅ Plan clear ہو گیا";

      case "/next":
        return "ℹ️ اگلا step شروع کرنے کے لیے مجھے بتائیں: 'اگلا step شروع کرو' یا 'ہاں'";

      case "/skip": {
        const nextStep = this.memory.getNextStep();
        if (!nextStep) return "ℹ️ کوئی pending step نہیں ہے۔";
        this.memory.skipStep(nextStep.id, "User skipped");
        this.refreshSystemPrompt();
        return `⏭️ Step ${nextStep.id} skip ہو گیا`;
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

📋 PLAN COMMANDS (نئے!):
  /plan                       - Show active plan
  /status                     - Show progress
  /next                       - Start next step
  /skip                       - Skip current step
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
  notes             - General notes`;

      case "/clear":
        this.conversationHistory = [];
        return "✅ Chat history clear ہو گئی";

      default:
        return null;
    }
  }
}

module.exports = Agent;

const ModelClient = require("./modelClient");
const FileSystem = require("./fileSystem");
const Terminal = require("./terminal");
const ProjectContext = require("./projectContext");
const ToolHandler = require("./toolHandler");
const Memory = require("./memory");
const path = require("path");

class Agent {
  constructor(projectPath, memoryPath) {
  this.modelClient = new ModelClient();
  this.fileSystem = new FileSystem(projectPath);
  this.terminal = new Terminal(projectPath);
  this.projectContext = new ProjectContext(projectPath);
  this.toolHandler = new ToolHandler(projectPath);
  // ✅ پروجیکٹ-اسپیسفک میموری پاتھ
  this.memory = new Memory(memoryPath || path.join(__dirname, "../memory"));
  this.projectPath = projectPath;
  this.conversationHistory = [];
  this.agentSettings = {}; // ✅ سیٹنگز محفوظ کریں
  this.systemPrompt = this.buildSystemPrompt();
  }
    buildSystemPrompt(agentSettings = {}) {
  // ✅ سیٹنگز محفوظ کریں تاکہ refresh میں استعمال ہو سکیں
  this.agentSettings = agentSettings;
  
  const name = agentSettings.name || "Coder";
  const role = agentSettings.role || "Personal AI Coding Assistant";
  const language = agentSettings.language || "English";
  const rules = agentSettings.rules || `Always write clean, readable and reusable code.
Follow DRY principles and existing project architecture.
Do not add unnecessary dependencies.
Keep explanations concise.`;
  const technologies = agentSettings.technologies || [
    "React", "React Native", "Next.js", "Expo",
    "JavaScript", "HTML", "CSS",
  ];
  const context = this.projectContext.getContextString();
  const memoryStr = this.memory.getMemoryString();
  return `You are ${name}, a ${role}.
You communicate in ${language} only.
You are an expert in: ${technologies.join(", ")}.
You have access to tools to read and write project files.
RULES:
${rules}
When asked to create or modify code:
1. First use list_files or read_file to understand the project
2. Then write the code using write_file tool
3. Finally explain what you did and which files were changed
MEMORY (things to always remember):
${memoryStr}
PROJECT CONTEXT:
${context}`;
}

  // memory refresh کریں
  refreshSystemPrompt() {
  // ✅ اب یہ صرف buildSystemPrompt کو کال کرے گا — کوئی hardcoded نہیں
  this.systemPrompt = this.buildSystemPrompt(this.agentSettings);
}

  async chat(userMessage, onChunk = null) {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const tools = this.toolHandler.getToolDefinitions();
    let messages = [
      { role: "system", content: this.systemPrompt },
      ...this.conversationHistory,
    ];

    while (true) {
      let response;

      if (onChunk) {
        // streaming mode
        response = await this.modelClient.sendMessageWithToolsStream(
          messages,
          tools,
          onChunk
        );
      } else {
        // normal mode
        response = await this.modelClient.sendMessageWithTools(
          messages,
          tools
        );
      }

      if (
        response.finish_reason === "tool_calls" &&
        response.message.tool_calls
      ) {
        // streaming میں chunk بھیجنا بند کریں tools کے دوران
        if (onChunk) onChunk(null);

        messages.push({
          role: "assistant",
          content: response.message.content,
          tool_calls: response.message.tool_calls,
        });

        for (const toolCall of response.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          const toolResult = await this.toolHandler.executeTool(
            toolName,
            toolInput
          );

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: String(toolResult),
          });
        }

        continue;
      }

      const finalResponse = response.message.content;

      this.conversationHistory.push({
        role: "assistant",
        content: finalResponse,
      });

      return finalResponse;
    }
  }

  async handleCommand(input) {
    const parts = input.trim().split(" ");
    const command = parts[0];

    switch (command) {
      case "/list":
        return this.fileSystem.listFiles(parts[1] || "");

      case "/read":
        if (!parts[1])
          return "Error: Please provide file path. Example: /read src/App.js";
        return this.fileSystem.readFile(parts[1]);

      case "/create":
        if (!parts[1])
          return "Error: Please provide file path. Example: /create src/Button.js";
        return this.fileSystem.createFile(parts[1]);

      case "/delete":
        if (!parts[1])
          return "Error: Please provide file path. Example: /delete src/Button.js";
        return this.fileSystem.deleteFile(parts[1]);

      case "/search":
        if (!parts[1])
          return "Error: Please provide search term. Example: /search Button";
        return this.fileSystem.searchFiles(parts[1]);

      case "/run": {
        if (!parts[1])
          return "Error: Please provide command. Example: /run npm install";
        const cmd = parts.slice(1).join(" ");
        const result = await this.terminal.run(cmd);
        return result.output;
      }

      case "/context":
        return this.projectContext.getContextString();

      case "/refresh":
        this.projectContext.context = null;
        this.refreshSystemPrompt();
        return "✅ Project context and memory refreshed";

      // memory commands
      case "/remember": {
        if (parts.length < 3) {
          return `Error: Usage: /remember [category] [text]
Categories: preferences, projectDecisions, completedTasks, notes
Example: /remember preferences "Always use functional components"`;
        }
        const category = parts[1];
        const item = parts.slice(2).join(" ");
        const result = this.memory.remember(category, item);
        this.refreshSystemPrompt();
        return result;
      }

      case "/forget": {
        if (parts.length < 3) {
          return "Error: Usage: /forget [category] [text]";
        }
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

      case "/help":
        return `Available commands:
/list [path]                    - List files in project
/read [path]                    - Read a file
/create [path]                  - Create a new file
/delete [path]                  - Delete a file
/search [term]                  - Search for files
/run [command]                  - Run a terminal command
/context                        - Show current project context
/refresh                        - Refresh project context and memory
/remember [category] [text]     - Save something to memory
/forget [category] [text]       - Remove from memory
/memory                         - Show all memory
/memory-clear                   - Clear all memory
/clear                          - Clear chat history
/help                           - Show this help

Memory categories:
  preferences       - How you like things done
  projectDecisions  - Important project decisions
  completedTasks    - What has been built
  notes             - General notes`;

      case "/clear":
        this.conversationHistory = [];
        return "✅ Chat history cleared";

      default:
        return null;
    }
  }
}

module.exports = Agent;

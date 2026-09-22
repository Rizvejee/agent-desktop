const FileSystem = require("./fileSystem");
const Terminal = require("./terminal");
const path = require("path");

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const MAX_TOOL_OUTPUT = 8000;  // Tool result کی زیادہ سے زیادہ لمبائی

class ToolHandler {
  constructor(projectPath) {
    this.fileSystem = new FileSystem(projectPath);
    this.terminal = new Terminal(projectPath);
    this.projectPath = projectPath;
    this.memory = null;  // ✅ Agent.js سے set ہوگی
  }

  // ✅ Memory set کرنے کا method
  setMemory(memory) {
    this.memory = memory;
  }

  // ═══════════════════════════════════════════════════════
  // 🛠️ AVAILABLE TOOLS کی DEFINITION
  // ═══════════════════════════════════════════════════════
  getToolDefinitions() {
    return [
      // ─── فائل پڑھنا ───────────────────────────────
      {
        name: "read_file",
        description: "Read the contents of a file in the project",
        input_schema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to the file relative to project root. Example: src/App.js",
            },
          },
          required: ["file_path"],
        },
      },

      // ─── فائل لکھنا ───────────────────────────────
      {
        name: "write_file",
        description: "Write or update content to a file in the project. Creates the file if it does not exist.",
        input_schema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to the file relative to project root. Example: src/components/Button.js",
            },
            content: {
              type: "string",
              description: "The full content to write to the file",
            },
          },
          required: ["file_path", "content"],
        },
      },

      // ─── فائلیں دیکھنا ────────────────────────────
      {
        name: "list_files",
        description: "List all files and folders in the project or a subdirectory",
        input_schema: {
          type: "object",
          properties: {
            sub_path: {
              type: "string",
              description: "Optional subdirectory path. Leave empty for root. Example: src/components",
            },
          },
          required: [],
        },
      },

      // ─── فائل تلاش کرنا ───────────────────────────
      {
        name: "search_files",
        description: "Search for files by name in the project",
        input_schema: {
          type: "object",
          properties: {
            search_term: {
              type: "string",
              description: "File name or part of file name to search for",
            },
          },
          required: ["search_term"],
        },
      },

      // ─── فائل delete کرنا ─────────────────────────
      {
        name: "delete_file",
        description: "Permanently delete a file from the project directory",
        input_schema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to the file relative to project root. Example: src/old-component.js",
            },
          },
          required: ["file_path"],
        },
      },

      // ─── Terminal command ─────────────────────────
      {
        name: "run_command",
        description: "Run an allowed terminal command in the project directory",
        input_schema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Command to run. Allowed: npm install, npm run build, npm test, npm run dev, node, yarn, pnpm",
            },
          },
          required: ["command"],
        },
      },

      // 🆕 ─── Memory میں save کرنا ──────────────────
      {
        name: "save_to_memory",
        description: "Save important information to memory for future reference. Use this AUTOMATICALLY when user states a preference, makes a decision, completes a task, or when you read a knowledge file/plan.",
        input_schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Category: preferences, projectDecisions, completedTasks, notes",
              enum: ["preferences", "projectDecisions", "completedTasks", "notes"],
            },
            item: {
              type: "string",
              description: "The information to remember (clear and concise)",
            },
          },
          required: ["category", "item"],
        },
      },

      // 🆕 ─── Knowledge Index میں save کرنا ─────────
      {
        name: "index_knowledge_file",
        description: "Create a short summary (max 100 words) of a knowledge file and save it to the knowledge index. Use this when you read a knowledge file for the first time.",
        input_schema: {
          type: "object",
          properties: {
            file_name: {
              type: "string",
              description: "Name of the knowledge file (e.g., project-plan.txt)",
            },
            summary: {
              type: "string",
              description: "Short summary in max 100 words describing what the file contains",
            },
          },
          required: ["file_name", "summary"],
        },
      },

      // 🆕 ─── Relevant Knowledge ڈھونڈنا ────────────
      {
        name: "search_knowledge",
        description: "Search the knowledge index to find which files are relevant to the current task. Returns file names and their summaries.",
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "What you're looking for (e.g., 'login system', 'API endpoints', 'button component')",
            },
          },
          required: ["query"],
        },
      },

      // 🆕 ─── Chat Summary بنانا ────────────────────
      {
        name: "summarize_chat",
        description: "Summarize older chat messages (more than 10 messages ago) into 2-3 lines and save to memory. Use this when conversation gets long.",
        input_schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "2-3 line summary of older messages",
            },
            message_count: {
              type: "number",
              description: "How many messages were summarized",
            },
          },
          required: ["summary", "message_count"],
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════════════
  // 📏 TRUNCATE LONG OUTPUTS
  // ═══════════════════════════════════════════════════════
  truncateOutput(output) {
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
  // 🔧 TOOL چلائیں
  // ═══════════════════════════════════════════════════════
  async executeTool(toolName, toolInput) {
    console.log(`\n🔧 Using tool: ${toolName}`);

    try {
      switch (toolName) {
        // ─── فائل پڑھنا ─────────────────────────────
        case "read_file": {
          console.log(`📄 Reading: ${toolInput.file_path}`);
          const content = this.fileSystem.readFile(toolInput.file_path);
          return this.truncateOutput(content);
        }

        // ─── فائل لکھنا ─────────────────────────────
        case "write_file": {
          console.log(`✍️  Writing: ${toolInput.file_path}`);
          const result = this.fileSystem.writeFile(
            toolInput.file_path,
            toolInput.content
          );
          return result;
        }

        // ─── فائلیں دیکھنا ──────────────────────────
        case "list_files": {
          console.log(`📁 Listing files`);
          const files = this.fileSystem.listFiles(toolInput.sub_path || "");
          return this.truncateOutput(files);
        }

        // ─── فائل تلاش کرنا ─────────────────────────
        case "search_files": {
          console.log(`🔍 Searching: ${toolInput.search_term}`);
          const results = this.fileSystem.searchFiles(toolInput.search_term);
          return this.truncateOutput(results);
        }

        // ─── فائل delete کرنا ───────────────────────
        case "delete_file": {
          console.log(`🗑️ Deleting: ${toolInput.file_path}`);
          const result = this.fileSystem.deleteFile(toolInput.file_path);
          return result;
        }

        // ─── Terminal command ───────────────────────
        case "run_command": {
          console.log(`⚡ Running: ${toolInput.command}`);

          if (!this.terminal.isAllowed(toolInput.command)) {
            return `❌ Command not allowed: ${toolInput.command}\n` +
                   `Reason: Command is not in the allowed list.\n` +
                   `Allowed commands: npm, node, yarn, pnpm, ls, dir, echo, cat, pwd`;
          }

          const cmdResult = await this.terminal.run(toolInput.command);
          return this.truncateOutput(cmdResult.output);
        }

        // 🆕 ─── Memory میں save کرنا ────────────────
        case "save_to_memory": {
          console.log(`💾 Saving to memory: [${toolInput.category}] ${toolInput.item}`);

          if (!this.memory) {
            return `❌ Error: Memory not initialized`;
          }

          const category = toolInput.category || "notes";
          const item = toolInput.item || "";

          if (!item.trim()) {
            return `❌ Error: Item cannot be empty`;
          }

          const result = this.memory.remember(category, item);
          return result;
        }

        // 🆕 ─── Knowledge Index میں save کرنا ───────
        case "index_knowledge_file": {
          console.log(`📚 Indexing knowledge: ${toolInput.file_name}`);

          if (!this.memory) {
            return `❌ Error: Memory not initialized`;
          }

          const fileName = toolInput.file_name || "";
          let summary = toolInput.summary || "";

          if (!fileName.trim()) {
            return `❌ Error: File name cannot be empty`;
          }

          if (!summary.trim()) {
            return `❌ Error: Summary cannot be empty`;
          }

          // ✅ Summary کو 100 الفاظ تک محدود کریں
          const words = summary.split(/\s+/);
          if (words.length > 100) {
            summary = words.slice(0, 100).join(" ") + "...";
          }

          const result = this.memory.addKnowledgeIndex(fileName, summary);
          return result;
        }

        // 🆕 ─── Relevant Knowledge ڈھونڈنا ─────────
        case "search_knowledge": {
          console.log(`🔍 Searching knowledge for: ${toolInput.query}`);

          if (!this.memory) {
            return `❌ Error: Memory not initialized`;
          }

          const query = (toolInput.query || "").toLowerCase();
          const index = this.memory.getKnowledgeIndex();
          const entries = Object.entries(index);

          if (entries.length === 0) {
            return `No knowledge files indexed yet.`;
          }

          // ✅ Simple keyword matching
          const relevant = entries.filter(([fileName, data]) => {
            const searchText = `${fileName} ${data.summary}`.toLowerCase();
            return query.split(/\s+/).some(word =>
              word.length > 2 && searchText.includes(word)
            );
          });

          if (relevant.length === 0) {
            return `No relevant knowledge files found for: "${toolInput.query}"\n\nAll indexed files:\n` +
              entries.map(([f, d]) => `- ${f}: ${d.summary}`).join("\n");
          }

          const result = `Found ${relevant.length} relevant file(s):\n\n` +
            relevant.map(([f, d]) => `📄 ${f}\n   ${d.summary}`).join("\n\n");

          return result;
        }

        // 🆕 ─── Chat Summary بنانا ─────────────────
        case "summarize_chat": {
          console.log(`💬 Summarizing chat: ${toolInput.message_count} messages`);

          if (!this.memory) {
            return `❌ Error: Memory not initialized`;
          }

          const summary = toolInput.summary || "";
          const messageCount = toolInput.message_count || 0;

          if (!summary.trim()) {
            return `❌ Error: Summary cannot be empty`;
          }

          if (messageCount < 1) {
            return `❌ Error: Message count must be at least 1`;
          }

          const result = this.memory.saveChatSummary(summary, messageCount);
          return result;
        }

        default:
          return `❌ Error: Unknown tool: ${toolName}`;
      }
    } catch (error) {
      console.error(`❌ Tool execution error:`, error);
      return `❌ Error executing ${toolName}: ${error.message}`;
    }
  }
}

module.exports = ToolHandler;

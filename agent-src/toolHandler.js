const FileSystem = require("./fileSystem");
const Terminal = require("./terminal");

const MAX_TOOL_OUTPUT = 8000;

class ToolHandler {
  constructor(projectPath) {
    this.fileSystem = new FileSystem(projectPath);
    this.terminal = new Terminal(projectPath);
    this.projectPath = projectPath;
    this.memory = null;
  }

  setMemory(memory) {
    this.memory = memory;
  }

  getToolDefinitions() {
    return [
      {
        name: "read_file",
        description: "Read the contents of a file in the project",
        input_schema: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Path relative to project root" },
          },
          required: ["file_path"],
        },
      },
      {
        name: "write_file",
        description: "Write or update content to a file. Creates if doesn't exist.",
        input_schema: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Path relative to project root" },
            content: { type: "string", description: "Full content to write" },
          },
          required: ["file_path", "content"],
        },
      },
      {
        name: "list_files",
        description: "List all files and folders in the project or a subdirectory",
        input_schema: {
          type: "object",
          properties: {
            sub_path: { type: "string", description: "Optional subdirectory path" },
          },
          required: [],
        },
      },
      {
        name: "search_files",
        description: "Search for files by name",
        input_schema: {
          type: "object",
          properties: {
            search_term: { type: "string", description: "File name or part to search" },
          },
          required: ["search_term"],
        },
      },
      {
        name: "delete_file",
        description: "Permanently delete a file",
        input_schema: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Path to delete" },
          },
          required: ["file_path"],
        },
      },
      {
        name: "run_command",
        description: "Run an allowed terminal command. Allowed: npm, node, yarn, pnpm, git, ls, cat, etc.",
        input_schema: {
          type: "object",
          properties: {
            command: { type: "string", description: "Command to run" },
          },
          required: ["command"],
        },
      },
      {
        name: "save_to_memory",
        description: "Save important info to memory. Use when: user states preference, decision made, task completed.",
        input_schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Category: preferences, projectDecisions, completedTasks, notes",
              enum: ["preferences", "projectDecisions", "completedTasks", "notes"],
            },
            item: { type: "string", description: "The information to remember as a SINGLE STRING" },
          },
          required: ["category", "item"],
        },
      },
      // ✅ REMOVED: index_knowledge_file
      // ✅ REMOVED: search_knowledge
      {
        name: "summarize_chat",
        description: "Summarize older chat messages into 2-3 lines",
        input_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "2-3 line summary" },
            message_count: { type: "number", description: "How many messages summarized" },
          },
          required: ["summary", "message_count"],
        },
      },
      // ✅ نئے Plan Tools
      {
        name: "save_plan",
        description: "Save a project plan to active-plan.json file. Use this when user asks to create a plan.",
        input_schema: {
          type: "object",
          properties: {
            task_description: { type: "string", description: "Short description of the plan" },
            steps: { type: "array", description: "Array of step descriptions", items: { type: "string" } },
          },
          required: ["task_description", "steps"],
        },
      },
      {
        name: "update_plan_step",
        description: "Update the status of a step in the active plan.",
        input_schema: {
          type: "object",
          properties: {
            step_index: { type: "number", description: "Step number (0-based)" },
            status: { type: "string", enum: ["done", "in-progress", "pending"] },
          },
          required: ["step_index", "status"],
        },
      },
      {
        name: "get_plan",
        description: "Get the current active plan.",
        input_schema: { type: "object", properties: {}, required: [] },
      },
    ];
  }

  truncateOutput(output) {
    const str = String(output);
    if (str.length <= MAX_TOOL_OUTPUT) return str;
    const half = Math.floor(MAX_TOOL_OUTPUT / 2);
    return str.slice(0, half) + `\n... [truncated] ...\n` + str.slice(-half);
  }

  async executeTool(toolName, toolInput) {
    console.log(`\n🔧 Using tool: ${toolName}`);
    try {
      switch (toolName) {
        case "read_file": return this.truncateOutput(this.fileSystem.readFile(toolInput.file_path));
        case "write_file": return this.fileSystem.writeFile(toolInput.file_path, toolInput.content);
        case "list_files": return this.truncateOutput(this.fileSystem.listFiles(toolInput.sub_path || ""));
        case "search_files": return this.truncateOutput(this.fileSystem.searchFiles(toolInput.search_term));
        case "delete_file": return this.fileSystem.deleteFile(toolInput.file_path);
        case "run_command": {
          if (!this.terminal.isAllowed(toolInput.command)) return `❌ Command not allowed: ${toolInput.command}`;
          const cmdResult = await this.terminal.run(toolInput.command);
          return this.truncateOutput(cmdResult.output);
        }
        case "save_to_memory": {
          if (!this.memory) return `❌ Error: Memory not initialized`;
          return this.memory.remember(toolInput.category || "notes", toolInput.item || "");
        }
        // ✅ REMOVED: index_knowledge_file case
        // ✅ REMOVED: search_knowledge case
        case "summarize_chat": {
          if (!this.memory) return `❌ Error: Memory not initialized`;
          return this.memory.saveChatSummaryData(toolInput.summary, toolInput.message_count);
        }
        case "save_plan": {
          if (!this.memory) return `❌ Error: Memory not initialized`;
          const plan = {
            taskDescription: toolInput.task_description,
            totalSteps: toolInput.steps.length,
            steps: toolInput.steps.map(s => ({ description: s, status: "pending" })),
            createdAt: new Date().toISOString(),
          };
          return this.memory.saveActivePlan(plan);
        }
        case "update_plan_step": {
          if (!this.memory) return `❌ Error: Memory not initialized`;
          return this.memory.updatePlanStep(toolInput.step_index, toolInput.status);
        }
        case "get_plan": {
          if (!this.memory) return `❌ Error: Memory not initialized`;
          const plan = this.memory.getActivePlan();
          if (!plan) return "ℹ️ No active plan found.";
          const progress = this.memory.getPlanProgress();
          let text = `📋 ACTIVE PLAN\nTask: ${plan.taskDescription}\nProgress: ${progress.done}/${progress.total} (${progress.percentage}%)\n\n`;
          plan.steps.forEach((s, i) => {
            const icon = s.status === "done" ? "✅" : s.status === "in-progress" ? "⏳" : "⏸️";
            text += `${icon} ${i + 1}. ${s.description}\n`;
          });
          return text;
        }
        default: return `❌ Error: Unknown tool: ${toolName}`;
      }
    } catch (error) {
      console.error(`❌ Tool execution error:`, error);
      return `❌ Error executing ${toolName}: ${error.message}`;
    }
  }
}

module.exports = ToolHandler;
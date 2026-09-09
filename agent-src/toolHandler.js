const FileSystem = require("./fileSystem");
const Terminal = require("./terminal");

class ToolHandler {
  constructor(projectPath) {
    this.fileSystem = new FileSystem(projectPath);
    this.terminal = new Terminal(projectPath);
  }

  // Agent کے لیے available tools کی definition
  getToolDefinitions() {
    return [
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
      {
        name: "run_command",
        description: "Run an allowed terminal command in the project directory",
        input_schema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Command to run. Allowed: npm install, npm run build, npm test, npm run dev",
            },
          },
          required: ["command"],
        },
      },
    ];
  }

  // tool چلائیں
  async executeTool(toolName, toolInput) {
    console.log(`\n🔧 Using tool: ${toolName}`);

    switch (toolName) {
      case "read_file": {
        const content = this.fileSystem.readFile(toolInput.file_path);
        console.log(`📄 Reading: ${toolInput.file_path}`);
        return content;
      }

      case "write_file": {
        console.log(`✍️  Writing: ${toolInput.file_path}`);
        // file exist کرتی ہے تو update کریں، نہیں تو create
        const result = this.fileSystem.writeFile(
          toolInput.file_path,
          toolInput.content
        );
        return result;
      }

      case "list_files": {
        const files = this.fileSystem.listFiles(toolInput.sub_path || "");
        console.log(`📁 Listing files`);
        return files;
      }

      case "search_files": {
        const results = this.fileSystem.searchFiles(toolInput.search_term);
        console.log(`🔍 Searching: ${toolInput.search_term}`);
        return results;
      }

      case "run_command": {
        console.log(`⚡ Running: ${toolInput.command}`);
        const cmdResult = await this.terminal.run(toolInput.command);
        return cmdResult.output;
      }

      default:
        return `Error: Unknown tool: ${toolName}`;
    }
  }
}

module.exports = ToolHandler;
#  AI Coding Agent (Electron + React)

A modern, secure, and token-efficient AI coding agent built with Electron and React. This agent understands your local projects, maintains context-aware memory, and assists in writing or refactoring code while strictly adhering to best practices and project-specific constraints.

## ✨ Key Features

-   **🧠 Smart Memory Architecture:** Separates Preferences, Decisions, Tasks, and Notes into distinct categories. Verifies actual project files instead of relying on stored structure to prevent stale data.
-   ** Active Plan Management:** Creates temporary roadmaps for large tasks stored in a separate `active-plan.json`, keeping the core memory clean and focused.
-   **⚡ Token Budget Optimization:** Enforces a strict 4000-token budget. Automatically truncates System Prompts, History, and Knowledge to maximize API efficiency without losing critical context.
-   **🛠️ Multi-Provider Support:** Seamlessly integrates with Groq, Google Gemini, and Ollama (Local) models.
-   **🔒 Secure File Operations:** Includes path traversal protection, binary file blocking, and a whitelisted command runner for safe terminal execution.
-   **💻 Modern UI:** Features Dark/Light theme support, VS Code-style File Explorer, Live Preview, and native Context Menus.
-   ** Streaming Responses:** Real-time token streaming with visual indicators for tool execution status.
-   **🌐 Urdu & RTL Support:** Optimized for Right-to-Left languages and Urdu text rendering.

## 🏗️ Tech Stack

-   **Frontend:** React, Vite, Lucide Icons, React Syntax Highlighter
-   **Desktop Shell:** Electron
-   **AI Integration:** Groq SDK, Google Generative AI, Ollama SDK
-   **Styling:** Inline Styles with Theme Context

## 🚀 Installation & Setup

### Prerequisites
-   Node.js (v18+)
-   npm or yarn
-   Groq/Gemini API Key (or Local Ollama installation)

### Steps
1.  Clone the repository:
```bash
    git clone https://github.com/your-username/ai-coding-agent.git
    cd ai-coding-agent
```

2.  Install dependencies:
```bash
    npm install
```

3.  Create a `.env` file and add your API keys:
```env
    GROQ_API_KEY=your_groq_key_here
    GEMINI_API_KEY=your_gemini_key_here
```

4.  Run in development mode:
```bash
    npm run dev
```

5.  Build for production:
```bash
    npm run build
```

## 📂 Project Architecture

```text
── agent-src/          # Core AI Logic
│   ├── agent.js        # Main Agent Class & System Prompt Builder
│   ├── memory.js       # Memory, Knowledge Index & Chat Summary Manager
│   ├── toolHandler.js  # Tool Definitions & Execution Logic
│   ├── fileSystem.js   # Secure File Operations
│   ── terminal.js     # Whitelisted Command Runner
├── electron/           # Desktop App Layer
│   ├── main.js         # IPC Handlers & Window Management
│   └── preload.js      # Safe Context Bridge
├── src/                # React Frontend
│   ├── components/     # ChatArea, Sidebar, FileExplorer, etc.
│   ├── pages/          # Settings, ProjectDashboard
│   └── hooks/          # useProjects, useChats
└── memory/             # Persistent Storage (Generated at runtime)
    └── projects/       # Per-project memory, plans & knowledge
```

## 🧠 Memory System Explained

This agent follows a strict separation of concerns as defined in `memory system.txt`:

| Concept | Location | Purpose |
| :--- | :--- | :--- |
| **Agent Config** | Settings UI | Name, Role, Language, Rules |
| **Project Instructions** | Dashboard > Instructions | Project-specific constraints |
| **Knowledge** | Dashboard > Knowledge | Requirements, Docs, Reference Files |
| **Memory** | `agent-memory.json` | Preferences, Decisions, Tasks, Notes |
| **Active Plan** | `active-plan.json` | Temporary roadmap for current task |
| **Chat Summary** | `chat-summary.json` | Compressed history of older messages |

> ⚠️ **Note:** The `projectStructure` category is deprecated. The agent always verifies actual project files instead of relying on stored structure to ensure accuracy.

## 🛡️ Security Features

-   **Path Validation:** All file operations are strictly confined to the project directory.
-   **Command Whitelist:** Only safe commands (`npm`, `node`, `git`, `ls`, etc.) can be executed.
-   **Binary Protection:** Reading or modifying Image/PDF/Executable files is blocked.
-   **Size Limits:** Enforced 5MB limits on both file uploads and tool outputs.

## 📝 Available Commands

Use these commands directly in the chat interface:

-   `/list [path]` - List project files
-   `/read [file]` - Read a specific file
-   `/plan` - Show current active plan
-   `/status` - Show plan progress
-   `/remember [cat] [text]` - Save to memory
-   `/knowledge-index` - View indexed knowledge files
-   `/budget` - Check current token usage
-   `/refresh` - Reload context and memory

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

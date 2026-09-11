import { useState, useEffect, useRef } from "react";

const DEFAULT_PROJECT = {
  id: "default",
  name: "Practice App",
  path: "/home/rizve424/practice-app",
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createNewChat() {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [
      {
        role: "agent",
        content: "Hello! I am Coder, your personal AI coding assistant. How can I help you today?\n\nType /help to see available commands.",
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export default function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [projects, setProjects] = useState([DEFAULT_PROJECT]);
  const [activeProject, setActiveProject] = useState(DEFAULT_PROJECT);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [fileTree, setFileTree] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const messagesEndRef = useRef(null);

  // شروع میں projects load کریں
  useEffect(() => {
    loadProjects();
  }, []);

  // project بدلنے پر chats load کریں
  useEffect(() => {
    if (activeProject) {
      loadChats(activeProject.id);
      loadFileTree(activeProject.path);
      loadInstructions(activeProject.id);
    }
  }, [activeProject]);
  async function loadInstructions(projectId) {
  const result = await window.electronAPI.getInstructions(projectId);
  if (result.success) {
    setInstructions(result.instructions);
  }
}

async function saveInstructions() {
  const result = await window.electronAPI.saveInstructions(
    activeProject.id,
    instructions
  );
  if (result.success) {
    setInstructionsSaved(true);
    setTimeout(() => setInstructionsSaved(false), 2000);
    // Agent کو reset کریں تاکہ نئی instructions apply ہوں
    await window.electronAPI.resetAgent(activeProject.path);
  }
}

  // messages scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isThinking]);

  // chat save کریں جب messages بدلیں
  useEffect(() => {
    if (activeChat && activeProject) {
      window.electronAPI.saveChat(activeProject.id, activeChat);
    }
  }, [activeChat?.messages]);

  async function loadProjects() {
    const result = await window.electronAPI.getProjects();
    if (result.success && result.projects.length > 0) {
      setProjects(result.projects);
      setActiveProject(result.projects[0]);
    } else {
      // default project save کریں
      await window.electronAPI.saveProjects([DEFAULT_PROJECT]);
    }
  }

  async function loadChats(projectId) {
    const result = await window.electronAPI.getChats(projectId);
    if (result.success) {
      if (result.chats.length > 0) {
        setChats(result.chats);
        setActiveChat(result.chats[0]);
      } else {
        // پہلی بار — نئی chat بنائیں
        const newChat = createNewChat();
        setChats([newChat]);
        setActiveChat(newChat);
        await window.electronAPI.saveChat(projectId, newChat);
      }
    }
  }

  async function loadFileTree(projectPath) {
    const result = await window.electronAPI.listFiles(projectPath, "");
    if (result.success) {
      setFileTree(result.result);
    }
  }

  async function sendMessage() {
    if (!input.trim() || isThinking || !activeChat) return;

    const userMessage = input.trim();
    setInput("");

    // user message شامل کریں
    const updatedChat = {
      ...activeChat,
      messages: [
        ...activeChat.messages,
        { role: "user", content: userMessage },
      ],
      updatedAt: Date.now(),
      // پہلا message chat title بن جائے
      title:
        activeChat.title === "New Chat"
          ? userMessage.slice(0, 30)
          : activeChat.title,
          
    };

    setActiveChat(updatedChat);
    setChats((prev) =>
      prev.map((c) => (c.id === updatedChat.id ? updatedChat : c))
    );

    setIsThinking(true);

    const result = await window.electronAPI.sendMessage(
        userMessage,
        activeProject.path,
        instructions
    );

    const agentMessage = {
      role: result.success ? "agent" : "system",
      content: result.success ? result.response : `Error: ${result.error}`,
    };

    const finalChat = {
      ...updatedChat,
      messages: [...updatedChat.messages, agentMessage],
      updatedAt: Date.now(),
    };

    setActiveChat(finalChat);
    setChats((prev) =>
      prev.map((c) => (c.id === finalChat.id ? finalChat : c))
    );

    setIsThinking(false);
    loadFileTree(activeProject.path);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function newChat() {
    const chat = createNewChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChat(chat);
    await window.electronAPI.saveChat(activeProject.id, chat);
    await window.electronAPI.resetAgent(activeProject.path);
  }

  async function deleteChat(chatId) {
    await window.electronAPI.deleteChat(activeProject.id, chatId);
    const remaining = chats.filter((c) => c.id !== chatId);
    setChats(remaining);
    if (activeChat?.id === chatId) {
      if (remaining.length > 0) {
        setActiveChat(remaining[0]);
      } else {
        const chat = createNewChat();
        setChats([chat]);
        setActiveChat(chat);
        await window.electronAPI.saveChat(activeProject.id, chat);
      }
    }
  }

  async function selectProject(project) {
    setActiveProject(project);
    await window.electronAPI.resetAgent(project.path);
  }

  async function addProject() {
    if (!newProjectName.trim() || !newProjectPath.trim()) return;
    const newProject = {
      id: generateId(),
      name: newProjectName.trim(),
      path: newProjectPath.trim(),
    };
    const updated = [...projects, newProject];
    setProjects(updated);
    await window.electronAPI.saveProjects(updated);
    setNewProjectName("");
    setNewProjectPath("");
    setShowNewProject(false);
    selectProject(newProject);
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>⬡</span>
        <span style={styles.headerTitle}>My Coding Agent</span>
        <span style={styles.headerStatus}>● Online</span>
      </div>

      <div style={styles.main}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Projects Section */}
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarHeading}>PROJECTS</div>

            <button
              style={styles.newButton}
              onClick={() => setShowNewProject(!showNewProject)}
            >
              + New Project
            </button>

            {showNewProject && (
              <div style={styles.newProjectForm}>
                <input
                  style={styles.formInput}
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
                <input
                  style={styles.formInput}
                  placeholder="Project path e.g. /home/user/my-app"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                />
                <div style={styles.formButtons}>
                  <button
                    style={styles.cancelButton}
                    onClick={() => setShowNewProject(false)}
                  >
                    Cancel
                  </button>
                  <button style={styles.addButton} onClick={addProject}>
                    Add
                  </button>
                </div>
              </div>
            )}

            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  ...styles.projectItem,
                  ...(activeProject?.id === project.id
                    ? styles.projectItemActive
                    : {}),
                }}
                onClick={() => selectProject(project)}
              >
                <span>📁</span>
                <span style={styles.projectName}>{project.name}</span>
              </div>
            ))}
          </div>
          {/* Instructions Section */}
          <div style={styles.sidebarSection}>
          <div style={styles.sidebarHeading}>INSTRUCTIONS</div>
          <button
          style={styles.newButton}
          onClick={() => setShowInstructions(!showInstructions)}
          >
          {showInstructions ? "Hide Instructions" : "Edit Instructions"}
          </button>
          </div>

          {/* Chats Section */}
          <div style={{ ...styles.sidebarSection, flex: 1, overflowY: "auto" }}>
            <div style={styles.sidebarHeading}>CHATS</div>

            <button style={styles.newButton} onClick={newChat}>
              + New Chat
            </button>

            {chats.map((chat) => (
              <div
                key={chat.id}
                style={{
                  ...styles.chatItem,
                  ...(activeChat?.id === chat.id ? styles.chatItemActive : {}),
                }}
                onClick={() => setActiveChat(chat)}
              >
                <span style={styles.chatTitle}>{chat.title}</span>
                <button
                  style={styles.deleteChatBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* File Tree */}
          <div style={styles.fileTreeSection}>
            <div style={styles.sidebarHeading}>FILES</div>
            <pre style={styles.fileTree}>{fileTree || "Loading..."}</pre>
          </div>
        </div>
        {/* Instructions Panel */}
        {showInstructions && (
        <div style={styles.instructionsPanel}>
        <div style={styles.instructionsHeader}>
        <span style={styles.instructionsTitle}>
        Custom Instructions — {activeProject?.name}
        </span>
        <button
        style={styles.closeButton}
        onClick={() => setShowInstructions(false)}
        >
        ×
        </button>
        </div>
        <textarea
        style={styles.instructionsTextarea}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder={`Example:\n- Always use functional components\n- Don't use TypeScript\n- Keep code simple and readable\n- Follow existing project style`}
        />
        <button
        style={styles.saveButton}
        onClick={saveInstructions}
        >
        {instructionsSaved ? "✓ Saved!" : "Save Instructions"}
        </button>
        </div>
        )}

        {/* Chat Area */}
        <div style={styles.chatArea}>
          {/* Project Header */}
          <div style={styles.projectHeader}>
            <span>📁</span>
            <span style={styles.projectHeaderName}>{activeProject?.name}</span>
            <span style={styles.projectHeaderPath}>{activeProject?.path}</span>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {activeChat?.messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(msg.role === "user"
                    ? styles.messageUser
                    : msg.role === "agent"
                    ? styles.messageAgent
                    : styles.messageSystem),
                }}
              >
                <div style={styles.messageSender}>
                  {msg.role === "user"
                    ? "You"
                    : msg.role === "agent"
                    ? "Coder"
                    : "System"}
                </div>
                <div style={styles.messageContent}>{msg.content}</div>
              </div>
            ))}

            {isThinking && (
              <div style={styles.thinking}>
                <span>Coder is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <textarea
              style={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message or /help for commands..."
              rows={1}
            />
            <button
              style={{
                ...styles.sendButton,
                ...(isThinking || !input.trim()
                  ? styles.sendButtonDisabled
                  : {}),
              }}
              onClick={sendMessage}
              disabled={isThinking || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f5f5f5",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    WebkitAppRegion: "drag",
  },
  headerIcon: { fontSize: "20px", color: "#2563eb" },
  headerTitle: { fontSize: "16px", fontWeight: "600", color: "#1a1a1a", flex: 1 },
  headerStatus: {
    fontSize: "12px", color: "#16a34a",
    background: "#dcfce7", padding: "2px 10px", borderRadius: "20px",
  },
  main: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: {
    width: "240px", background: "#fafafa",
    borderRight: "1px solid #e0e0e0",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  sidebarSection: { padding: "12px 16px", borderBottom: "1px solid #f0f0f0" },
  sidebarHeading: {
    fontSize: "10px", fontWeight: "600", color: "#999",
    letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px",
  },
  newButton: {
    width: "100%", padding: "7px", background: "transparent",
    border: "1px dashed #d0d0d0", borderRadius: "6px",
    color: "#666", fontSize: "12px", cursor: "pointer",
    marginBottom: "6px", textAlign: "left",
  },
  newProjectForm: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" },
  formInput: {
    padding: "6px 10px", border: "1px solid #e0e0e0",
    borderRadius: "6px", fontSize: "12px", outline: "none", background: "#ffffff",
  },
  formButtons: { display: "flex", gap: "6px" },
  cancelButton: {
    flex: 1, padding: "6px", background: "#f0f0f0",
    border: "none", borderRadius: "6px", fontSize: "12px",
    cursor: "pointer", color: "#666",
  },
  addButton: {
    flex: 1, padding: "6px", background: "#2563eb",
    border: "none", borderRadius: "6px", fontSize: "12px",
    cursor: "pointer", color: "#ffffff",
  },
  projectItem: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "7px 8px", borderRadius: "6px", cursor: "pointer",
    fontSize: "13px", color: "#444", marginBottom: "2px",
  },
  projectItemActive: { background: "#eff6ff", color: "#2563eb" },
  projectName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chatItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "7px 8px", borderRadius: "6px", cursor: "pointer",
    fontSize: "12px", color: "#444", marginBottom: "2px",
  },
  chatItemActive: { background: "#eff6ff", color: "#2563eb" },
  chatTitle: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  deleteChatBtn: {
    background: "none", border: "none", color: "#999",
    cursor: "pointer", fontSize: "16px", padding: "0 4px",
    lineHeight: 1, borderRadius: "4px",
  },
  fileTreeSection: { padding: "12px 16px", flex: 1, overflow: "auto" },
  fileTree: {
    fontSize: "11px", color: "#666", lineHeight: "1.8",
    whiteSpace: "pre-wrap", fontFamily: "Monaco, Menlo, monospace",
  },
  chatArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  projectHeader: {
    padding: "12px 20px", background: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    display: "flex", alignItems: "center", gap: "8px",
  },
  projectHeaderName: { fontSize: "14px", fontWeight: "600", color: "#1a1a1a" },
  projectHeaderPath: { fontSize: "11px", color: "#999", fontFamily: "Monaco, Menlo, monospace" },
  messages: {
    flex: 1, overflowY: "auto", padding: "20px",
    display: "flex", flexDirection: "column", gap: "16px",
  },
  message: { maxWidth: "80%", padding: "12px 16px", borderRadius: "12px", fontSize: "14px", lineHeight: "1.6" },
  messageUser: { background: "#2563eb", color: "#ffffff", alignSelf: "flex-end", borderBottomRightRadius: "4px" },
  messageAgent: {
    background: "#ffffff", color: "#1a1a1a", alignSelf: "flex-start",
    border: "1px solid #e0e0e0", borderBottomLeftRadius: "4px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  messageSystem: {
    background: "#dcfce7", color: "#16a34a", alignSelf: "center",
    fontSize: "12px", padding: "6px 12px", borderRadius: "20px",
  },
  messageSender: {
    fontSize: "10px", fontWeight: "600", textTransform: "uppercase",
    letterSpacing: "0.5px", opacity: 0.6, marginBottom: "6px",
  },
  messageContent: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
  thinking: { color: "#999", fontSize: "13px", padding: "8px 0", alignSelf: "flex-start" },
  inputArea: {
    padding: "16px 20px", background: "#ffffff",
    borderTop: "1px solid #e0e0e0", display: "flex",
    gap: "10px", alignItems: "flex-end",
    boxShadow: "0 -1px 3px rgba(0,0,0,0.06)",
  },
  textarea: {
    flex: 1, background: "#f5f5f5", border: "1px solid #e0e0e0",
    borderRadius: "8px", color: "#1a1a1a", padding: "10px 14px",
    fontSize: "14px", fontFamily: "inherit", resize: "none",
    minHeight: "40px", maxHeight: "120px", outline: "none",
  },
  sendButton: {
    background: "#2563eb", color: "white", border: "none",
    borderRadius: "8px", padding: "10px 20px", fontSize: "14px",
    fontWeight: "600", cursor: "pointer", height: "40px", whiteSpace: "nowrap",
  },
  sendButtonDisabled: { background: "#e0e0e0", color: "#aaa", cursor: "not-allowed" },
  instructionsPanel: {
  background: "#ffffff",
  borderBottom: "1px solid #e0e0e0",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
},
instructionsHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
},
instructionsTitle: {
  fontSize: "13px",
  fontWeight: "600",
  color: "#1a1a1a",
},
closeButton: {
  background: "none",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  color: "#999",
  lineHeight: 1,
},
instructionsTextarea: {
  width: "100%",
  height: "120px",
  padding: "10px",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  fontSize: "13px",
  fontFamily: "inherit",
  resize: "vertical",
  outline: "none",
  color: "#1a1a1a",
},
saveButton: {
  alignSelf: "flex-end",
  padding: "8px 20px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
},
};
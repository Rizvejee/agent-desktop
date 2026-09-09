import { useState, useEffect, useRef } from "react";

const DEFAULT_PROJECT = {
  id: "1",
  name: "Practice App",
  path: "/home/" + (window.electronAPI ? "user" : "rizve424") + "/practice-app",
};

export default function App() {
  const [projects, setProjects] = useState([DEFAULT_PROJECT]);
  const [activeProject, setActiveProject] = useState(DEFAULT_PROJECT);
  const [messages, setMessages] = useState([
    {
      role: "agent",
      content: "Hello! I am Coder, your personal AI coding assistant.\n\nSelect a project from the sidebar and start coding!\n\nType /help to see available commands.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [fileTree, setFileTree] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    loadFileTree();
  }, [activeProject]);

  async function loadFileTree() {
    if (!activeProject) return;
    try {
      const result = await window.electronAPI.listFiles(
        activeProject.path,
        ""
      );
      if (result.success) {
        setFileTree(result.result);
      }
    } catch (error) {
      setFileTree("Could not load files");
    }
  }

  async function sendMessage() {
    if (!input.trim() || isThinking) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    setIsThinking(true);

    try {
      const result = await window.electronAPI.sendMessage(
        userMessage,
        activeProject.path
      );

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: result.response },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `Error: ${result.error}` },
        ]);
      }

      // file tree refresh کریں
      loadFileTree();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Error: ${error.message}` },
      ]);
    }

    setIsThinking(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function selectProject(project) {
    setActiveProject(project);
    setMessages([
      {
        role: "agent",
        content: `Switched to project: ${project.name}\nPath: ${project.path}`,
      },
    ]);
    window.electronAPI.resetAgent(project.path);
  }

  function addProject() {
    if (!newProjectName.trim() || !newProjectPath.trim()) return;

    const newProject = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      path: newProjectPath.trim(),
    };

    setProjects((prev) => [...prev, newProject]);
    setNewProjectName("");
    setNewProjectPath("");
    setShowNewProject(false);
    selectProject(newProject);
  }

  function removeProject(projectId) {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject.id === projectId) {
      selectProject(projects[0]);
    }
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
          {/* Projects */}
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarHeading}>PROJECTS</div>

            <button
              style={styles.newButton}
              onClick={() => setShowNewProject(!showNewProject)}
            >
              + New Project
            </button>

            {/* New Project Form */}
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
                  placeholder="Project path"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                />
                <div style={styles.formButtons}>
                  <button style={styles.cancelButton} onClick={() => setShowNewProject(false)}>
                    Cancel
                  </button>
                  <button style={styles.addButton} onClick={addProject}>
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Project List */}
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  ...styles.projectItem,
                  ...(activeProject.id === project.id
                    ? styles.projectItemActive
                    : {}),
                }}
                onClick={() => selectProject(project)}
              >
                <span style={styles.projectIcon}>📁</span>
                <span style={styles.projectName}>{project.name}</span>
              </div>
            ))}
          </div>

          {/* File Tree */}
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarHeading}>PROJECT FILES</div>
            <pre style={styles.fileTree}>{fileTree || "Loading..."}</pre>
          </div>
        </div>

        {/* Chat Area */}
        <div style={styles.chatArea}>
          {/* Project Header */}
          <div style={styles.projectHeader}>
            <span style={styles.projectHeaderIcon}>📁</span>
            <span style={styles.projectHeaderName}>{activeProject.name}</span>
            <span style={styles.projectHeaderPath}>{activeProject.path}</span>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((msg, index) => (
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
                <span>Coder is thinking</span>
                <span style={styles.dots}>...</span>
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
  headerIcon: {
    fontSize: "20px",
    color: "#2563eb",
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  headerStatus: {
    fontSize: "12px",
    color: "#16a34a",
    background: "#dcfce7",
    padding: "2px 10px",
    borderRadius: "20px",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    width: "240px",
    background: "#fafafa",
    borderRight: "1px solid #e0e0e0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarSection: {
    padding: "16px",
    borderBottom: "1px solid #e0e0e0",
  },
  sidebarHeading: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#999",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  newButton: {
    width: "100%",
    padding: "8px",
    background: "transparent",
    border: "1px dashed #d0d0d0",
    borderRadius: "6px",
    color: "#666",
    fontSize: "13px",
    cursor: "pointer",
    marginBottom: "8px",
    textAlign: "left",
  },
  newProjectForm: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "8px",
  },
  formInput: {
    padding: "6px 10px",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
    background: "#ffffff",
  },
  formButtons: {
    display: "flex",
    gap: "6px",
  },
  cancelButton: {
    flex: 1,
    padding: "6px",
    background: "#f0f0f0",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#666",
  },
  addButton: {
    flex: 1,
    padding: "6px",
    background: "#2563eb",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#ffffff",
  },
  projectItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#444",
    marginBottom: "2px",
  },
  projectItemActive: {
    background: "#eff6ff",
    color: "#2563eb",
  },
  projectIcon: {
    fontSize: "14px",
  },
  projectName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileTree: {
    fontSize: "11px",
    color: "#666",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
    fontFamily: "Monaco, Menlo, monospace",
    overflow: "auto",
    maxHeight: "300px",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  projectHeader: {
    padding: "12px 20px",
    background: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  projectHeaderIcon: {
    fontSize: "16px",
  },
  projectHeaderName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  projectHeaderPath: {
    fontSize: "12px",
    color: "#999",
    fontFamily: "Monaco, Menlo, monospace",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  message: {
    maxWidth: "80%",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  messageUser: {
    background: "#2563eb",
    color: "#ffffff",
    alignSelf: "flex-end",
    borderBottomRightRadius: "4px",
  },
  messageAgent: {
    background: "#ffffff",
    color: "#1a1a1a",
    alignSelf: "flex-start",
    border: "1px solid #e0e0e0",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  messageSystem: {
    background: "#dcfce7",
    color: "#16a34a",
    alignSelf: "center",
    fontSize: "12px",
    padding: "6px 12px",
    borderRadius: "20px",
  },
  messageSender: {
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    opacity: 0.6,
    marginBottom: "6px",
  },
  messageContent: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  thinking: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#999",
    fontSize: "13px",
    padding: "8px 0",
    alignSelf: "flex-start",
  },
  dots: {
    animation: "pulse 1s infinite",
  },
  inputArea: {
    padding: "16px 20px",
    background: "#ffffff",
    borderTop: "1px solid #e0e0e0",
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
    boxShadow: "0 -1px 3px rgba(0,0,0,0.06)",
  },
  textarea: {
    flex: 1,
    background: "#f5f5f5",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    color: "#1a1a1a",
    padding: "10px 14px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "none",
    minHeight: "40px",
    maxHeight: "120px",
    outline: "none",
  },
  sendButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    height: "40px",
    whiteSpace: "nowrap",
  },
  sendButtonDisabled: {
    background: "#e0e0e0",
    color: "#aaa",
    cursor: "not-allowed",
  },
};
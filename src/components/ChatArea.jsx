import { useState, useEffect } from "react";
import { FolderOpen, Settings, X, Save } from "lucide-react";
import MessageList from "./MessageList";
import InputBar from "./InputBar";

export default function ChatArea({
  activeProject,
  activeChat,
  isThinking,
  onSendMessage,
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (activeProject) {
      loadInstructions();
    }
  }, [activeProject?.id]);

  async function loadInstructions() {
    const result = await window.electronAPI.getInstructions(activeProject.id);
    if (result.success) setInstructions(result.instructions);
  }

  async function saveInstructions() {
    await window.electronAPI.saveInstructions(activeProject.id, instructions);
    await window.electronAPI.resetAgent(activeProject.path);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // No project selected
  if (!activeProject) {
    return (
      <div style={styles.welcome}>
        <div style={styles.welcomeContent}>
          <div style={styles.welcomeIcon}>
            <FolderOpen size={48} color="#d0d0d0" />
          </div>
          <h2 style={styles.welcomeTitle}>Welcome to My Coding Agent</h2>
          <p style={styles.welcomeSubtitle}>
            Add a project from the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  // No chat selected
  if (!activeChat) {
    return (
      <div style={styles.welcome}>
        <div style={styles.welcomeContent}>
          <p style={styles.welcomeSubtitle}>Select or create a chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Project Header */}
      <div style={styles.header}>
        <FolderOpen size={15} color="#2563eb" />
        <span style={styles.projectName}>{activeProject.name}</span>
        <span style={styles.projectPath}>{activeProject.path}</span>
        <button
          style={{
            ...styles.settingsBtn,
            ...(showInstructions ? styles.settingsBtnActive : {}),
          }}
          onClick={() => setShowInstructions(!showInstructions)}
          title="Project Instructions"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Instructions Panel */}
      {showInstructions && (
        <div style={styles.instructionsPanel}>
          <div style={styles.instructionsHeader}>
            <span style={styles.instructionsTitle}>
              Custom Instructions — {activeProject.name}
            </span>
            <button
              style={styles.closeBtn}
              onClick={() => setShowInstructions(false)}
            >
              <X size={15} />
            </button>
          </div>
          <textarea
            style={styles.instructionsTextarea}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={
              "Example:\n- Always use functional components\n- Don't use TypeScript\n- Keep code simple and readable"
            }
          />
          <div style={styles.instructionsFooter}>
            <span style={styles.instructionsHint}>
              These instructions apply to all chats in this project.
            </span>
            <button style={styles.saveBtn} onClick={saveInstructions}>
              <Save size={13} />
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={activeChat.messages}
        isThinking={isThinking}
      />

      {/* Input */}
      <InputBar
        onSendMessage={onSendMessage}
        isThinking={isThinking}
        disabled={false}
      />
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#f5f5f5",
  },
  welcome: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
  },
  welcomeContent: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  welcomeIcon: {
    marginBottom: "8px",
  },
  welcomeTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: 0,
  },
  welcomeSubtitle: {
    fontSize: "14px",
    color: "#aaa",
    margin: 0,
  },
  header: {
    padding: "12px 20px",
    background: "#ffffff",
    borderBottom: "1px solid #ebebeb",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  projectName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  projectPath: {
    fontSize: "11px",
    color: "#bbb",
    fontFamily: "Monaco, Menlo, monospace",
    flex: 1,
  },
  settingsBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#bbb",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    borderRadius: "6px",
  },
  settingsBtnActive: {
    color: "#2563eb",
    background: "#eff6ff",
  },
  instructionsPanel: {
    background: "#ffffff",
    borderBottom: "1px solid #ebebeb",
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
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#bbb",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },
  instructionsTextarea: {
    width: "100%",
    height: "110px",
    padding: "10px 12px",
    border: "1px solid #ebebeb",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    color: "#1a1a1a",
    background: "#f8f8f8",
    lineHeight: "1.6",
    boxSizing: "border-box",
  },
  instructionsFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  instructionsHint: {
    fontSize: "11px",
    color: "#bbb",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "7px 16px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
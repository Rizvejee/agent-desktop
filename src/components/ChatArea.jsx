import { useState, useEffect } from "react";
import { FolderOpen, Settings, X, Save, Paperclip, FileText, Trash2 } from "lucide-react";
import MessageList from "./MessageList";
import InputBar from "./InputBar";

export default function ChatArea({
  activeProject,
  activeChat,
  isThinking,
  onSendMessage,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [saved, setSaved] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (activeProject) {
      loadInstructions();
      setAttachments([]);
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

  async function handleAddAttachment() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".js,.jsx,.ts,.tsx,.css,.html,.json,.md,.txt";
    fileInput.multiple = true;

    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);

      for (const file of files) {
        if (attachments.find((a) => a.name === file.name)) continue;

        // FileReader سے content پڑھیں
        const content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });

        setAttachments((prev) => [
          ...prev,
          { name: file.name, content: content },
        ]);
      }
    };

    fileInput.click();
  }

  function removeAttachment(name) {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
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
            ...(showSettings ? styles.settingsBtnActive : {}),
          }}
          onClick={() => setShowSettings(!showSettings)}
          title="Project Settings"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          <div style={styles.settingsHeader}>
            <span style={styles.settingsTitle}>Project Settings — {activeProject.name}</span>
            <button style={styles.closeBtn} onClick={() => setShowSettings(false)}>
              <X size={15} />
            </button>
          </div>

          {/* Instructions */}
          <div style={styles.settingsBlock}>
            <div style={styles.blockLabel}>Custom Instructions</div>
            <textarea
              style={styles.instructionsTextarea}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={"- Always use functional components\n- Keep code simple\n- No TypeScript"}
            />
            <button style={styles.saveBtn} onClick={saveInstructions}>
              <Save size={13} />
              {saved ? "Saved!" : "Save Instructions"}
            </button>
          </div>

          {/* Attachments */}
          <div style={styles.settingsBlock}>
            <div style={styles.blockLabel}>Context Files</div>

            {attachments.length > 0 && (
              <div style={styles.attachmentsList}>
                {attachments.map((file) => (
                  <div key={file.name} style={styles.attachmentItem}>
                    <FileText size={13} color="#2563eb" />
                    <span style={styles.attachmentName}>{file.name}</span>
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeAttachment(file.name)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length === 0 && (
              <p style={styles.emptyAttachments}>
                No files attached. Add files to give Agent more context.
              </p>
            )}

            <button style={styles.addAttachmentBtn} onClick={handleAddAttachment}>
              <Paperclip size={13} />
              Add Files
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={activeChat.messages} isThinking={isThinking} />

      {/* Input */}
      <InputBar
        onSendMessage={onSendMessage}
        isThinking={isThinking}
        disabled={false}
        attachments={attachments}
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
  welcomeIcon: { marginBottom: "8px" },
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
  settingsPanel: {
    background: "#ffffff",
    borderBottom: "1px solid #ebebeb",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxHeight: "320px",
    overflowY: "auto",
  },
  settingsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsTitle: {
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
  settingsBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    paddingTop: "12px",
    borderTop: "1px solid #f0f0f0",
  },
  blockLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#888",
  },
  instructionsTextarea: {
    width: "100%",
    height: "90px",
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
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "7px 14px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    alignSelf: "flex-end",
  },
  attachmentsList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  attachmentItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "#f8f8f8",
    border: "1px solid #ebebeb",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#1a1a1a",
  },
  attachmentName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#444",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#ccc",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },
  emptyAttachments: {
    fontSize: "12px",
    color: "#bbb",
    margin: 0,
  },
  addAttachmentBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    background: "none",
    border: "1px dashed #ddd",
    borderRadius: "7px",
    fontSize: "12px",
    color: "#888",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
};

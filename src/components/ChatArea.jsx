import { useState, useEffect } from "react";
import { FolderOpen, Settings, X, Edit3, Check, Paperclip, FileText, Trash2 } from "lucide-react";
import MessageList from "./MessageList";
import InputBar from "./InputBar";

export default function ChatArea({
  activeProject,
  activeChat,
  isThinking,
  onSendMessage,
  toolStatuses,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [savedInstructions, setSavedInstructions] = useState("");
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (activeProject) {
      loadInstructions();
      setAttachments([]);
    }
  }, [activeProject?.id]);

  async function loadInstructions() {
    const result = await window.electronAPI.getInstructions(activeProject.id);
    if (result.success) {
      setInstructions(result.instructions);
      setSavedInstructions(result.instructions);
    }
  }

  async function saveInstructions() {
    await window.electronAPI.saveInstructions(activeProject.id, instructions);
    await window.electronAPI.resetAgent(activeProject.path);
    setSavedInstructions(instructions);
    setIsEditingInstructions(false);
  }

  function cancelEdit() {
    setInstructions(savedInstructions);
    setIsEditingInstructions(false);
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
        const content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });
        setAttachments((prev) => [
          ...prev,
          { name: file.name, content },
        ]);
      }
    };

    fileInput.click();
  }

  function removeAttachment(name) {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }

  if (!activeProject) {
    return (
      <div style={styles.welcome}>
        <div style={styles.welcomeContent}>
          <FolderOpen size={48} color="#d0d0d0" />
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
      {/* Header */}
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
            <span style={styles.settingsTitle}>
              Project Settings — {activeProject.name}
            </span>
            <button
              style={styles.closeBtn}
              onClick={() => setShowSettings(false)}
            >
              <X size={15} />
            </button>
          </div>

          {/* Instructions Block */}
          <div style={styles.settingsBlock}>
            <div style={styles.blockHeader}>
              <span style={styles.blockLabel}>Custom Instructions</span>
              {!isEditingInstructions && (
                <button
                  style={styles.editBtn}
                  onClick={() => setIsEditingInstructions(true)}
                >
                  <Edit3 size={12} />
                  Edit
                </button>
              )}
            </div>

            {isEditingInstructions ? (
              <>
                <textarea
                  style={styles.instructionsTextarea}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={
                    "- Always use functional components\n- Keep code simple\n- No TypeScript"
                  }
                  autoFocus
                />
                <div style={styles.instructionsBtns}>
                  <button style={styles.cancelBtn} onClick={cancelEdit}>
                    Cancel
                  </button>
                  <button style={styles.saveBtn} onClick={saveInstructions}>
                    <Check size={13} />
                    Save
                  </button>
                </div>
              </>
            ) : (
              <div style={styles.instructionsPreview}>
                {savedInstructions ? (
                  <pre style={styles.instructionsText}>{savedInstructions}</pre>
                ) : (
                  <span style={styles.emptyText}>No instructions added yet.</span>
                )}
              </div>
            )}
          </div>

          {/* Attachments Block */}
          <div style={styles.settingsBlock}>
            <div style={styles.blockHeader}>
              <span style={styles.blockLabel}>Context Files</span>
              <button style={styles.editBtn} onClick={handleAddAttachment}>
                <Paperclip size={12} />
                Add File
              </button>
            </div>

            {attachments.length > 0 ? (
              <div style={styles.attachmentsList}>
                {attachments.map((file) => (
                  <div key={file.name} style={styles.attachmentItem}>
                    <FileText size={13} color="#2563eb" />
                    <span style={styles.attachmentName}>{file.name}</span>
                    <span style={styles.attachmentSize}>
                      {(file.content.length / 1024).toFixed(1)} KB
                    </span>
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeAttachment(file.name)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span style={styles.emptyText}>
                No files attached. Files give Agent more context.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={activeChat.messages}
        isThinking={isThinking}
        toolStatuses={toolStatuses}
      />

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
    gap: "14px",
    maxHeight: "340px",
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
  blockHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#888",
  },
  editBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    background: "#f5f5f5",
    border: "1px solid #ebebeb",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#666",
    cursor: "pointer",
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
  instructionsBtns: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "6px 14px",
    background: "#f5f5f5",
    border: "1px solid #ebebeb",
    borderRadius: "7px",
    fontSize: "12px",
    color: "#666",
    cursor: "pointer",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 14px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  instructionsPreview: {
    padding: "10px 12px",
    background: "#f8f8f8",
    borderRadius: "8px",
    border: "1px solid #ebebeb",
    minHeight: "40px",
  },
  instructionsText: {
    fontSize: "12px",
    color: "#444",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    margin: 0,
    fontFamily: "inherit",
  },
  emptyText: {
    fontSize: "12px",
    color: "#bbb",
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
  },
  attachmentName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#444",
    fontSize: "12px",
  },
  attachmentSize: {
    fontSize: "11px",
    color: "#bbb",
    flexShrink: 0,
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
};

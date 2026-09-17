import { useState, useEffect } from "react";
import { FolderOpen, MessageSquare } from "lucide-react";
import MessageList from "./MessageList";
import InputBar from "./InputBar";
import { useTheme } from "../ThemeContext";

export default function ChatArea({
  activeProject,
  activeChat,
  isThinking,
  onSendMessage,
  onStopMessage,
  toolStatuses,
  streamingContent,
}) {
  const { theme } = useTheme();
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
        setAttachments((prev) => [...prev, { name: file.name, content }]);
      }
    };

    fileInput.click();
  }

  function removeAttachment(name) {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }

  if (!activeProject) {
    return (
      <div
        style={{
          ...styles.welcome,
          background: theme.bgMain,
        }}
      >
        <div style={styles.welcomeContent}>
          <div
            style={{
              ...styles.welcomeIconBox,
              background: theme.bgCard,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadowMd,
            }}
          >
            <FolderOpen size={32} color={theme.accent} />
          </div>
          <h2 style={{ ...styles.welcomeTitle, color: theme.textPrimary }}>
            Welcome to My Coding Agent
          </h2>
          <p style={{ ...styles.welcomeSubtitle, color: theme.textMuted }}>
            Add a project from the sidebar to get started.
          </p>
          <button
            style={{
              ...styles.welcomeBtn,
              background: theme.accent,
              color: theme.textInverse,
            }}
            onClick={() => {}}
          >
            <FolderOpen size={15} />
            Add Project
          </button>
        </div>
      </div>
    );
  }

  if (!activeChat) {
    return (
      <div style={{ ...styles.welcome, background: theme.bgMain }}>
        <div style={styles.welcomeContent}>
          <p style={{ ...styles.welcomeSubtitle, color: theme.textMuted }}>
            Select or create a chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, background: theme.bgMain }}>

       {/* Header */}
       {/* Header — چیٹ کا نام باکس میں */}
<div
  style={{
    ...styles.header,
    background: "transparent",
    borderBottom: "none",
    boxShadow: "none",
    justifyContent: "center",
    padding: "14px 20px 8px",
  }}
  >
  <div
    style={{
      background: theme.bgCard,
      border: `1px solid ${theme.border}`,
      borderRadius: "20px",
      padding: "6px 16px",
      boxShadow: theme.shadow,
      display: "flex",
      alignItems: "center",
      gap: "6px",
    }}
    >
    <MessageSquare size={13} color={theme.textMuted} />
    <span style={{ ...styles.chatTitle, color: theme.textSecondary }}>
      {activeChat.title}
    </span>
  </div>
</div>
      {/* Messages */}
      <MessageList
        messages={activeChat.messages}
        isThinking={isThinking}
        toolStatuses={toolStatuses}
        streamingContent={streamingContent}
      />

      {/* Input */}
      <InputBar
        onSendMessage={onSendMessage}
        onStopMessage={onStopMessage}
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
  },
  welcome: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeContent: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  welcomeIconBox: {
    width: "72px",
    height: "72px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  welcomeTitle: {
    fontSize: "22px",
    fontWeight: "700",
    margin: 0,
  },
  welcomeSubtitle: {
    fontSize: "14px",
    margin: 0,
    maxWidth: "300px",
    lineHeight: "1.6",
  },
  welcomeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "4px",
  },
  header: {
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
  },
  projectName: {
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: 1,
  },
  projectPath: {
    fontSize: "11px",
    fontFamily: "Monaco, Menlo, monospace",
    lineHeight: 1,
  },
  settingsBtn: {
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "6px",
    borderRadius: "8px",
  },
  settingsPanel: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxHeight: "340px",
    overflowY: "auto",
    flexShrink: 0,
  },
  settingsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsTitle: {
    fontSize: "13px",
    fontWeight: "600",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },
  settingsBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    paddingTop: "12px",
  },
  blockHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockLabel: {
    fontSize: "12px",
    fontWeight: "600",
  },
  editBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
  },
  instructionsTextarea: {
    width: "100%",
    height: "90px",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
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
    borderRadius: "7px",
    fontSize: "12px",
    cursor: "pointer",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 14px",
    border: "none",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  instructionsPreview: {
    padding: "10px 12px",
    borderRadius: "8px",
    minHeight: "40px",
  },
  instructionsText: {
    fontSize: "12px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    margin: 0,
    fontFamily: "inherit",
  },
  emptyText: {
    fontSize: "12px",
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
    borderRadius: "8px",
  },
  attachmentName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },
  attachmentSize: {
    fontSize: "11px",
    flexShrink: 0,
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },

  chatTitle: {
  fontSize: "16px",
  fontWeight: "550",
  letterSpacing: "0.3px",
},
};

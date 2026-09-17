import { useState, useEffect } from "react";
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  FileText,
  Trash2,
  Edit2,
  MessageSquare,
  Brain,
  BookOpen,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import { useTheme } from "../ThemeContext";

// Three dot menu component
function ThreeDotMenu({ items, theme }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        style={{
          ...menuStyles.trigger,
          color: theme.textMuted,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <>
          <div
            style={menuStyles.overlay}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              ...menuStyles.menu,
              background: theme.bgCard,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadowMd,
            }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                style={{
                  ...menuStyles.item,
                  color: item.danger ? "#ef4444" : theme.textSecondary,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Rename modal
function RenameModal({ title, value, onSave, onClose, theme }) {
  const [text, setText] = useState(value);

  return (
    <div style={modalStyles.overlay}>
      <div
        style={{
          ...modalStyles.modal,
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadowMd,
        }}
      >
        <div style={modalStyles.header}>
          <span style={{ ...modalStyles.title, color: theme.textPrimary }}>
            {title}
          </span>
          <button
            style={{ ...modalStyles.closeBtn, color: theme.textMuted }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <input
          style={{
            ...modalStyles.input,
            background: theme.bgInput,
            border: `1px solid ${theme.border}`,
            color: theme.textPrimary,
          }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(text);
            if (e.key === "Escape") onClose();
          }}
        />
        <div style={modalStyles.buttons}>
          <button
            style={{
              ...modalStyles.cancelBtn,
              background: theme.bgHover,
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...modalStyles.saveBtn,
              background: theme.accent,
              color: "#fff",
            }}
            onClick={() => onSave(text)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
    // EportChat
    async function exportChat(chat) {
      const result = await window.electronAPI.exportChat(chat);
      if (result.success) {
        alert(`Exported!\n${result.filePath}`);
      } else if (result.error) {
        alert(`Failed: ${result.error}`);
      }
    }

function AddKnowledgeModal({ onClose, onSaveFile, onUploadFile, theme }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  async function handleSave() {
    if (!name.trim() || !content.trim()) return;
    await onSaveFile({ name: name.trim(), content: content.trim() });
    onClose();
  }

  return (
    <div style={modalStyles.overlay}>
      <div
        style={{
          ...modalStyles.modal,
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadowMd,
          width: "480px",
        }}
      >
        <div style={modalStyles.header}>
          <span style={{ ...modalStyles.title, color: theme.textPrimary }}>
            Add Knowledge
          </span>
          <button
            style={{ ...modalStyles.closeBtn, color: theme.textMuted }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Upload File */}
        <button
          style={{
            ...addKnowledgeStyles.uploadBtn,
            background: theme.bgInput,
            border: `1px dashed ${theme.border}`,
            color: theme.textSecondary,
          }}
          onClick={onUploadFile}
        >
          <FileText size={18} color={theme.accent} />
          <span>Upload a file from your computer</span>
        </button>

        {/* Divider */}
        <div style={addKnowledgeStyles.divider}>
          <div style={{ ...addKnowledgeStyles.dividerLine, background: theme.border }} />
          <span style={{ ...addKnowledgeStyles.dividerText, color: theme.textMuted }}>
            or write manually
          </span>
          <div style={{ ...addKnowledgeStyles.dividerLine, background: theme.border }} />
        </div>

        {/* Manual Text */}
        <div style={addKnowledgeStyles.fields}>
          <div style={addKnowledgeStyles.field}>
            <label style={{ ...addKnowledgeStyles.label, color: theme.textSecondary }}>
              File Name
            </label>
            <input
              style={{
                ...modalStyles.input,
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
              }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. project-notes.md"
            />
          </div>

          <div style={addKnowledgeStyles.field}>
            <label style={{ ...addKnowledgeStyles.label, color: theme.textSecondary }}>
              Content
            </label>
            <textarea
              style={{
                ...addKnowledgeStyles.textarea,
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
              }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your notes, documentation or any text here..."
            />
          </div>
        </div>

        <div style={modalStyles.buttons}>
          <button
            style={{
              ...modalStyles.cancelBtn,
              background: theme.bgHover,
              color: theme.textSecondary,
              border: `1px solid ${theme.border}`,
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{
              ...modalStyles.saveBtn,
              background: name.trim() && content.trim() ? theme.accent : theme.bgHover,
              color: name.trim() && content.trim() ? "#fff" : theme.textMuted,
              cursor: name.trim() && content.trim() ? "pointer" : "not-allowed",
            }}
            onClick={handleSave}
            disabled={!name.trim() || !content.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDashboard({
  project,
  chats,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("chats");
  const [instructions, setInstructions] = useState("");
  const [savedInstructions, setSavedInstructions] = useState("");
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [memory, setMemory] = useState("");
  const [fileTree, setFileTree] = useState("");
  const [renameModal, setRenameModal] = useState(null);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");

  useEffect(() => {
    if (project) {
      loadInstructions();
      loadKnowledgeFiles();
      loadMemory();
      loadFileTree();
    }
  }, [project?.id]);

  async function loadInstructions() {
    const result = await window.electronAPI.getInstructions(project.id);
    if (result.success) {
      setInstructions(result.instructions);
      setSavedInstructions(result.instructions);
    }
  }

  async function saveInstructions() {
    await window.electronAPI.saveInstructions(project.id, instructions);
    await window.electronAPI.resetAgent(project.path);
    setSavedInstructions(instructions);
    setIsEditingInstructions(false);
  }



  async function loadKnowledgeFiles() {
    const result = await window.electronAPI.getKnowledgeFiles(project.id);
    if (result.success) setKnowledgeFiles(result.files);
  }

  async function handleUploadFile() {
  setShowAddKnowledge(false);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".js,.jsx,.ts,.tsx,.css,.html,.json,.md,.txt";
  fileInput.multiple = true;

  fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const content = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });
      await window.electronAPI.saveKnowledgeFile(project.id, {
        name: file.name,
        content,
      });
    }
    loadKnowledgeFiles();
  };

  fileInput.click();
}

  async function handleSaveManualFile(file) {
  await window.electronAPI.saveKnowledgeFile(project.id, file);
  loadKnowledgeFiles();
}

  async function deleteKnowledgeFile(fileName) {
    await window.electronAPI.deleteKnowledgeFile(project.id, fileName);
    loadKnowledgeFiles();
  }

  async function loadMemory() {
    const result = await window.electronAPI.getProjectMemory(project.id);
    if (result.success) setMemory(result.memory);
  }

  async function loadFileTree() {
    const result = await window.electronAPI.listFiles(project.path, "");
    if (result.success) setFileTree(result.result);
  }

  const tabs = [
    { id: "chats", label: "Chats", icon: <MessageSquare size={15} /> },
    { id: "instructions", label: "Instructions", icon: <BookOpen size={15} /> },
    { id: "knowledge", label: "Knowledge", icon: <FileText size={15} /> },
    { id: "memory", label: "Memory", icon: <Brain size={15} /> },
  ];

  return (
    <div style={{ ...styles.container, background: theme.bgMain }}>
      {/* Rename Modal */}
      {renameModal && (
        <RenameModal
          title={renameModal.title}
          value={renameModal.value}
          onSave={(newName) => {
            renameModal.onSave(newName);
            setRenameModal(null);
          }}
          onClose={() => setRenameModal(null)}
          theme={theme}
        />
      )}

      {/* Header */}
      <div
        style={{
          ...styles.header,
          background: theme.bgCard,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <FolderOpen size={18} color={theme.accent} />
        <div style={styles.headerInfo}>
          <span style={{ ...styles.projectName, color: theme.textPrimary }}>
            {project.name}
          </span>
          <span style={{ ...styles.projectPath, color: theme.textMuted }}>
            {project.path}
          </span>
        </div>
      </div>

      <div style={styles.body}>
        {/* Left — Tabs + Content */}
        <div style={styles.mainContent}>
          {/* Tabs */}
          <div
            style={{
              ...styles.tabs,
              borderBottom: `1px solid ${theme.border}`,
              background: theme.bgCard,
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                style={{
                  ...styles.tab,
                  color:
                    activeTab === tab.id ? theme.accent : theme.textMuted,
                  borderBottom:
                    activeTab === tab.id
                      ? `2px solid ${theme.accent}`
                      : "2px solid transparent",
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>
            {/* Chats */}
            {activeTab === "chats" && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <span style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                    Chats
                  </span>
                  <button
                    style={{
                      ...styles.addBtn,
                      background: theme.accent,
                      color: "#fff",
                    }}
                    onClick={() => onNewChat(project.id)}
                  >
                    <Plus size={14} />
                    New Chat
                  </button>
                </div>

                <div style={styles.chatList}>
                  {chats.length === 0 && (
                    <div style={styles.empty}>
                      <MessageSquare size={32} color={theme.textMuted} />
                      <span style={{ color: theme.textMuted }}>
                        No chats yet. Start a new chat.
                      </span>
                    </div>
                  )}

                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      style={{
                        ...styles.chatItem,
                        background: theme.bgCard,
                        border: `1px solid ${theme.border}`,
                      }}
                      onClick={() => onSelectChat(chat)}
                    >
                      <MessageSquare size={15} color={theme.accent} />
                      <div style={styles.chatInfo}>
                        <span style={{ ...styles.chatTitle, color: theme.textPrimary }}>
                          {chat.title}
                        </span>
                        <span style={{ ...styles.chatDate, color: theme.textMuted }}>
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <ChevronRight size={14} color={theme.textMuted} />
                      <ThreeDotMenu
                      theme={theme}
                      items={[
                      {
                      icon: <Edit2 size={13} />,
                      label: "Rename",
                      onClick: () =>
                      setRenameModal({
                      title: "Rename Chat",
                      value: chat.title,
                      onSave: (name) => onRenameChat(project.id, chat.id, name),
                      }),
                    },
                    {
                      icon: <FileText size={13} />,
                      label: "Export as Text",
                      onClick: () => exportChat(chat),
                    },
                    {
                     icon: <Trash2 size={13} />,
                     label: "Delete",
                     danger: true,
                     onClick: () => onDeleteChat(project.id, chat.id),
                    },
                    ]}
                    />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {activeTab === "instructions" && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <span style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                    Custom Instructions
                  </span>
                  {!isEditingInstructions && (
                    <button
                      style={{
                        ...styles.editBtn,
                        background: theme.bgHover,
                        border: `1px solid ${theme.border}`,
                        color: theme.textSecondary,
                      }}
                      onClick={() => setIsEditingInstructions(true)}
                    >
                      <Edit2 size={13} />
                      Edit
                    </button>
                  )}
                </div>

                <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
                  These instructions apply to all chats in this project.
                </p>

                {isEditingInstructions ? (
                  <div style={styles.editBlock}>
                    <textarea
                      style={{
                        ...styles.textarea,
                        background: theme.bgInput,
                        border: `1px solid ${theme.accent}`,
                        color: theme.textPrimary,
                      }}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder={
                        "- Always use functional components\n- Keep code simple\n- No TypeScript\n- Follow existing project style"
                      }
                      autoFocus
                    />
                    <div style={styles.editBtns}>
                      <button
                        style={{
                          ...styles.cancelBtn,
                          background: theme.bgHover,
                          border: `1px solid ${theme.border}`,
                          color: theme.textSecondary,
                        }}
                        onClick={() => {
                          setInstructions(savedInstructions);
                          setIsEditingInstructions(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        style={{
                          ...styles.saveBtn,
                          background: theme.accent,
                          color: "#fff",
                        }}
                        onClick={saveInstructions}
                      >
                        <Check size={13} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.preview,
                      background: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    {savedInstructions ? (
                      <pre style={{ ...styles.previewText, color: theme.textSecondary }}>
                        {savedInstructions}
                      </pre>
                    ) : (
                      <span style={{ color: theme.textMuted }}>
                        No instructions yet. Click Edit to add.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Knowledge Files */}
            {activeTab === "knowledge" && (
              <div style={styles.section}>
                {/* Modal */}
              {showAddKnowledge && (
              <AddKnowledgeModal
              theme={theme}
              onClose={() => setShowAddKnowledge(false)}
              onSaveFile={handleSaveManualFile}
              onUploadFile={handleUploadFile}
              />
             )}

                <div style={styles.sectionHeader}>
                  <span style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                    Knowledge Files
                  </span>
                  <button
                   style={{
                   ...styles.addBtn,
                  background: theme.accent,
                  color: "#fff",
                  }}
                  onClick={() => setShowAddKnowledge(true)}
                  >
                  <Plus size={14} />
                   Add Knowledge
                  </button>
                </div>

                <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
                  Files added here are always available to the Agent in this project.
                </p>

                {knowledgeFiles.length === 0 && (
                  <div style={styles.empty}>
                    <FileText size={32} color={theme.textMuted} />
                    <span style={{ color: theme.textMuted }}>
                      No knowledge files yet.
                    </span>
                  </div>
                )}

                <div style={styles.fileList}>
                  {knowledgeFiles.map((file) => (
                    <div
                      key={file.name}
                      style={{
                        ...styles.fileItem,
                        background: theme.bgCard,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <FileText size={15} color={theme.accent} />
                      <div style={styles.fileInfo}>
                        <span style={{ ...styles.fileName, color: theme.textPrimary }}>
                          {file.name}
                        </span>
                        <span style={{ ...styles.fileSize, color: theme.textMuted }}>
                          {(file.content.length / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <ThreeDotMenu
                        theme={theme}
                        items={[
                          {
                            icon: <Trash2 size={13} />,
                            label: "Delete",
                            danger: true,
                            onClick: () => deleteKnowledgeFile(file.name),
                          },
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory */}
            {activeTab === "memory" && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <span style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                    Agent Memory
                  </span>
                  <button
                    style={{
                      ...styles.editBtn,
                      background: theme.bgHover,
                      border: `1px solid ${theme.border}`,
                      color: theme.textSecondary,
                    }}
                    onClick={loadMemory}
                  >
                    Refresh
                  </button>
                </div>

                <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
                  What the Agent has remembered about this project.
                </p>

                <div
                  style={{
                    ...styles.preview,
                    background: theme.bgCard,
                    border: `1px solid ${theme.border}`,
                    minHeight: "200px",
                  }}
                >
                  {memory ? (
                    <pre style={{ ...styles.previewText, color: theme.textSecondary }}>
                      {memory}
                    </pre>
                  ) : (
                    <span style={{ color: theme.textMuted }}>
                      No memory yet. Start chatting to build memory.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — File Tree */}
        <div
          style={{
            ...styles.fileTreePanel,
            background: theme.bgSidebar,
            borderLeft: `1px solid ${theme.border}`,
          }}
        >
          <div style={styles.fileTreeHeader}>
            <span style={{ ...styles.fileTreeTitle, color: theme.textMuted }}>
              Project Files
            </span>
          </div>
          <pre style={{ ...styles.fileTree, color: theme.textMuted }}>
            {fileTree || "Loading..."}
          </pre>
        </div>
      </div>
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
  header: {
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  projectName: {
    fontSize: "16px",
    fontWeight: "700",
    lineHeight: 1,
  },
  projectPath: {
    fontSize: "11px",
    fontFamily: "Monaco, Menlo, monospace",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tabs: {
    display: "flex",
    padding: "0 20px",
    flexShrink: 0,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "12px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.15s",
  },
  tabContent: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxWidth: "680px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
  },
  sectionDesc: {
    fontSize: "13px",
    lineHeight: "1.5",
    margin: 0,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  editBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 12px",
    borderRadius: "7px",
    fontSize: "12px",
    cursor: "pointer",
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  chatItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  chatInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  chatTitle: {
    fontSize: "14px",
    fontWeight: "500",
  },
  chatDate: {
    fontSize: "11px",
  },
  fileList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
  },
  fileInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  fileName: {
    fontSize: "13px",
    fontWeight: "500",
  },
  fileSize: {
    fontSize: "11px",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "40px",
    opacity: 0.5,
    fontSize: "13px",
  },
  editBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  textarea: {
    width: "100%",
    height: "160px",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "13px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    lineHeight: "1.6",
    boxSizing: "border-box",
  },
  editBtns: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "7px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "7px 16px",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  preview: {
    padding: "14px",
    borderRadius: "10px",
    minHeight: "80px",
  },
  previewText: {
    fontSize: "13px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    margin: 0,
    fontFamily: "inherit",
  },
  fileTreePanel: {
    width: "220px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
  },
  fileTreeHeader: {
    padding: "14px 14px 8px",
    flexShrink: 0,
  },
  fileTreeTitle: {
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  fileTree: {
    fontSize: "11px",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
    fontFamily: "Monaco, Menlo, monospace",
    padding: "0 14px 14px",
    overflowY: "auto",
    flex: 1,
    margin: 0,
  },
};

const menuStyles = {
  trigger: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 99,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: "100%",
    borderRadius: "8px",
    padding: "4px",
    minWidth: "140px",
    zIndex: 100,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    background: "none",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    width: "100%",
    textAlign: "left",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  modal: {
    borderRadius: "12px",
    padding: "20px",
    width: "340px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "15px",
    fontWeight: "600",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  buttons: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "7px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
  },
  saveBtn: {
    padding: "7px 16px",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
const addKnowledgeStyles = {
  uploadBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    fontWeight: "500",
    textAlign: "left",
    boxSizing: "border-box",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "4px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
  },
  dividerText: {
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
  },
  textarea: {
    width: "100%",
    height: "140px",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    lineHeight: "1.6",
    boxSizing: "border-box",
  },
};

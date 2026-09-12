import { useState, useEffect } from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";

export default function Sidebar({
  projects,
  activeProject,
  chats,
  activeChat,
  onAddProject,
  onRemoveProject,
  onSwitchProject,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}) {
  const [fileTree, setFileTree] = useState("");
  const [showChats, setShowChats] = useState(true);

  useEffect(() => {
    if (activeProject) {
      loadFileTree();
    }
  }, [activeProject]);

  async function loadFileTree() {
    const result = await window.electronAPI.listFiles(
      activeProject.path,
      ""
    );
    if (result.success) setFileTree(result.result);
  }

  return (
    <div style={styles.sidebar}>
      {/* Projects Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Projects</span>
          <button style={styles.iconBtn} onClick={onAddProject} title="Add Project">
            <Plus size={14} />
          </button>
        </div>

        <div style={styles.projectList}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                ...styles.projectItem,
                ...(activeProject?.id === project.id
                  ? styles.projectItemActive
                  : {}),
              }}
              onClick={() => onSwitchProject(project)}
            >
              <FolderOpen
                size={14}
                color={activeProject?.id === project.id ? "#2563eb" : "#888"}
              />
              <span style={styles.projectName}>{project.name}</span>
              <button
                style={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveProject(project.id);
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          {projects.length === 0 && (
            <button style={styles.addProjectBtn} onClick={onAddProject}>
              <Plus size={13} />
              Add your first project
            </button>
          )}
        </div>
      </div>

      {/* Chats Section */}
      {activeProject && (
        <div style={{ ...styles.section, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Chats</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                style={styles.iconBtn}
                onClick={() => onNewChat(activeProject.id)}
                title="New Chat"
              >
                <Plus size={14} />
              </button>
              <button
                style={styles.iconBtn}
                onClick={() => setShowChats(!showChats)}
              >
                {showChats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {showChats && (
            <div style={styles.chatList}>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  style={{
                    ...styles.chatItem,
                    ...(activeChat?.id === chat.id
                      ? styles.chatItemActive
                      : {}),
                  }}
                  onClick={() => onSelectChat(chat)}
                >
                  <MessageSquare
                    size={12}
                    color={activeChat?.id === chat.id ? "#2563eb" : "#aaa"}
                  />
                  <span style={styles.chatTitle}>{chat.title}</span>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(activeProject.id, chat.id);
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Tree */}
      {activeProject && fileTree && (
        <div style={styles.fileTreeSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Files</span>
          </div>
          <pre style={styles.fileTree}>{fileTree}</pre>
        </div>
      )}
    </div>
  );
}

const styles = {
  sidebar: {
    width: "240px",
    background: "#f9f9f9",
    borderRight: "1px solid #ebebeb",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
  },
  section: {
    padding: "14px",
    borderBottom: "1px solid #ebebeb",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#aaa",
    letterSpacing: "0.5px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    padding: "3px",
    borderRadius: "4px",
  },
  projectList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  projectItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#444",
    transition: "background 0.15s",
  },
  projectItemActive: {
    background: "#eff6ff",
    color: "#2563eb",
  },
  projectName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: "500",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#ccc",
    display: "flex",
    alignItems: "center",
    padding: "2px",
    borderRadius: "4px",
    opacity: 1,
  },
  addProjectBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 10px",
    background: "none",
    border: "1px dashed #ddd",
    borderRadius: "8px",
    color: "#aaa",
    fontSize: "12px",
    cursor: "pointer",
    width: "100%",
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflowY: "auto",
    flex: 1,
  },
  chatItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#666",
  },
  chatItemActive: {
    background: "#eff6ff",
    color: "#2563eb",
  },
  chatTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileTreeSection: {
    padding: "14px",
    overflow: "auto",
    maxHeight: "200px",
  },
  fileTree: {
    fontSize: "11px",
    color: "#888",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
    fontFamily: "Monaco, Menlo, monospace",
  },
};

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Settings,
  User,
} from "lucide-react";
import { useTheme } from "../ThemeContext";

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
  onOpenSettings,
  showSettings,
}) {
  const { theme } = useTheme();
  const [fileTree, setFileTree] = useState("");
  const [showChats, setShowChats] = useState(true);

  useEffect(() => {
    if (activeProject) loadFileTree();
  }, [activeProject]);

  async function loadFileTree() {
    const result = await window.electronAPI.listFiles(activeProject.path, "");
    if (result.success) setFileTree(result.result);
  }

  return (
    <div
      style={{
        ...styles.sidebar,
        background: theme.bgSidebar,
        borderRight: `1px solid ${theme.border}`,
      }}
    >
      {/* Projects */}
      <div
        style={{
          ...styles.section,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={styles.sectionHeader}>
          <span style={{ ...styles.sectionTitle, color: theme.textMuted }}>
            Projects
          </span>
          <button
            style={{ ...styles.iconBtn, color: theme.textMuted }}
            onClick={onAddProject}
            title="Add Project"
          >
            <Plus size={14} />
          </button>
        </div>

        <div style={styles.list}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                ...styles.item,
                background:
                  activeProject?.id === project.id
                    ? theme.bgActive
                    : "transparent",
                color:
                  activeProject?.id === project.id
                    ? theme.accent
                    : theme.textSecondary,
              }}
              onClick={() => onSwitchProject(project)}
            >
              <FolderOpen
                size={14}
                color={
                  activeProject?.id === project.id
                    ? theme.accent
                    : theme.textMuted
                }
              />
              <span style={styles.itemLabel}>{project.name}</span>
              <button
                style={{ ...styles.deleteBtn, color: theme.textMuted }}
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
            <button
              style={{
                ...styles.emptyBtn,
                border: `1px dashed ${theme.border}`,
                color: theme.textMuted,
              }}
              onClick={onAddProject}
            >
              <Plus size={13} />
              Add your first project
            </button>
          )}
        </div>
      </div>

      {/* Chats */}
      {activeProject && (
        <div
          style={{
            ...styles.section,
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={styles.sectionHeader}>
            <span style={{ ...styles.sectionTitle, color: theme.textMuted }}>
              Chats
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                style={{ ...styles.iconBtn, color: theme.textMuted }}
                onClick={() => onNewChat(activeProject.id)}
                title="New Chat"
              >
                <Plus size={14} />
              </button>
              <button
                style={{ ...styles.iconBtn, color: theme.textMuted }}
                onClick={() => setShowChats(!showChats)}
              >
                {showChats ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </div>
          </div>

          {showChats && (
            <div style={styles.chatList}>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  style={{
                    ...styles.item,
                    background:
                      activeChat?.id === chat.id
                        ? theme.bgActive
                        : "transparent",
                    color:
                      activeChat?.id === chat.id
                        ? theme.accent
                        : theme.textSecondary,
                  }}
                  onClick={() => onSelectChat(chat)}
                >
                  <MessageSquare
                    size={12}
                    color={
                      activeChat?.id === chat.id
                        ? theme.accent
                        : theme.textMuted
                    }
                  />
                  <span style={styles.itemLabel}>{chat.title}</span>
                  <button
                    style={{ ...styles.deleteBtn, color: theme.textMuted }}
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
        <div
          style={{
            ...styles.fileTreeSection,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={styles.sectionHeader}>
            <span style={{ ...styles.sectionTitle, color: theme.textMuted }}>
              Files
            </span>
          </div>
          <pre style={{ ...styles.fileTree, color: theme.textMuted }}>
            {fileTree}
          </pre>
        </div>
      )}

      {/* Bottom Settings */}
      <div
        style={{
          ...styles.bottomBar,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <button
          style={{
            ...styles.settingsBarBtn,
            background: showSettings ? theme.bgActive : "transparent",
            color: showSettings ? theme.accent : theme.textSecondary,
          }}
          onClick={onOpenSettings}
        >
          <div style={styles.userAvatar}>
            <User size={13} color={theme.accent} />
          </div>
          <span style={styles.settingsBarLabel}>Rizwan</span>
          <Settings size={14} color={theme.textMuted} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "240px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
  },
  section: {
    padding: "12px 12px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "6px",
    padding: "0 4px",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "3px",
    borderRadius: "4px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 8px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background 0.15s",
  },
  itemLabel: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "2px",
    borderRadius: "4px",
    opacity: 1,
  },
  emptyBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 10px",
    background: "none",
    borderRadius: "8px",
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
  fileTreeSection: {
    padding: "12px",
    overflow: "auto",
    maxHeight: "180px",
  },
  fileTree: {
    fontSize: "11px",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
    fontFamily: "Monaco, Menlo, monospace",
    margin: 0,
  },
  bottomBar: {
    padding: "10px 12px",
    marginTop: "auto",
    flexShrink: 0,
  },
  settingsBarBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    width: "100%",
    background: "none",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
  },
  userAvatar: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingsBarLabel: {
    flex: 1,
    textAlign: "left",
  },
};
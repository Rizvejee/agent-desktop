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
  MoreHorizontal,
  Edit2,
  FolderTree,
  Eye,
} from "lucide-react";
import { useTheme } from "../ThemeContext";

// Three dot menu
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
        <MoreHorizontal size={14} />
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
  onRenameChat,
  onOpenSettings,
  showSettings,
  onOpenFiles,    
  showFiles,
  onOpenPreview,    
  showPreview, 
}) {
  const { theme } = useTheme();
  const [showChats, setShowChats] = useState(true);
  const [renameModal, setRenameModal] = useState(null);

  return (
    <div
      style={{
        ...styles.sidebar,
        background: theme.bgSidebar,
        borderRight: `1px solid ${theme.border}`,
      }}
    >
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
              <ThreeDotMenu
                theme={theme}
                items={[
                  {
                    icon: <Trash2 size={12} />,
                    label: "Remove",
                    danger: true,
                    onClick: () => onRemoveProject(project.id),
                  },
                ]}
              />
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
                  <ThreeDotMenu
                    theme={theme}
                    items={[
                      {
                        icon: <Edit2 size={12} />,
                        label: "Rename",
                        onClick: () =>
                          setRenameModal({
                            title: "Rename Chat",
                            value: chat.title,
                            onSave: (name) =>
                              onRenameChat(activeProject.id, chat.id, name),
                          }),
                      },
                      {
                        icon: <Trash2 size={12} />,
                        label: "Delete",
                        danger: true,
                        onClick: () => onDeleteChat(activeProject.id, chat.id),
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom Action Buttons (Files + Terminal) ─── */}
<div style={{ marginTop: "auto" }}> {/* ← یہ لائن دونوں کو نیچے لائے گی */}
     {/* Files Button */}
<div
  style={{
    padding: "6px 12px",
    borderTop: `1px solid ${theme.border}`,
  }}
>
  <button
    style={{
      ...styles.settingsBarBtn,
      background: showFiles ? theme.bgActive : "transparent",
      color: showFiles ? theme.accent : theme.textSecondary,
    }}
    onClick={onOpenFiles}
  >
    <div
      style={{
        width: "26px",
        height: "26px",
        borderRadius: "6px",
        background: showFiles ? theme.accentLight : theme.bgHover,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <FolderTree size={13} color={showFiles ? theme.accent : theme.textMuted} />
    </div>
    <span style={styles.settingsBarLabel}>Files</span>
  </button>
</div>

      {/* Preview Button */}
<div style={{ padding: "6px 12px" }}>
  <button
    style={{
      ...styles.settingsBarBtn,
      background: showPreview ? theme.bgActive : "transparent",
      color: showPreview ? theme.accent : theme.textSecondary,
    }}
    onClick={onOpenPreview}
  >
    <div
      style={{
        width: "26px",
        height: "26px",
        borderRadius: "6px",
        background: showPreview ? theme.accentLight : theme.bgHover,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Eye size={13} color={showPreview ? theme.accent : theme.textMuted} />
    </div>
    <span style={styles.settingsBarLabel}>Preview</span>
  </button>
</div>
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
    padding: "12px",
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
  },
  itemLabel: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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

const menuStyles = {
  trigger: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "3px",
    borderRadius: "4px",
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
    minWidth: "130px",
    zIndex: 100,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    background: "none",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
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
    width: "320px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  header: {
    display: "flex",
    alignItems: "center",
  },
  title: {
    fontSize: "15px",
    fontWeight: "600",
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

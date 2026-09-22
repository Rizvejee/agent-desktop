import { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext";
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileImage,
  ChevronRight,
  ChevronDown,
  X,
  RefreshCw,
  Copy,
  Check,
  Edit2,
  Save,
  Trash2,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// فائل کی extension سے icon منتخب کریں
function getFileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  const codeExts = ["js", "jsx", "ts", "tsx", "py", "java", "cpp", "c", "go", "rs"];
  const textExts = ["md", "txt", "json", "yaml", "yml", "xml", "html", "css", "scss"];
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp"];

  if (codeExts.includes(ext)) return <FileCode size={14} />;
  if (textExts.includes(ext)) return <FileText size={14} />;
  if (imageExts.includes(ext)) return <FileImage size={14} />;
  return <File size={14} />;
}

// فائل کی extension سے language detect کریں
function getLanguage(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rs: "rust",
    md: "markdown",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    html: "html",
    css: "css",
    scss: "scss",
    xml: "xml",
    sh: "bash",
    bash: "bash",
    sql: "sql",
  };
  return map[ext] || "plaintext";
}

// ═══════════════════════════════════════════════════════
// TREE NODE (Right-click menu کے ساتھ)
// ═══════════════════════════════════════════════════════
function TreeNode({ 
  node, 
  depth, 
  expanded, 
  onToggle, 
  onSelect, 
  selectedPath, 
  theme,
  onContextMenu,
}) {
  const isFolder = node.type === "folder";
  const isExpanded = expanded.has(node.path);
  const isSelected = selectedPath === node.path;

  function handleClick() {
    if (isFolder) {
      onToggle(node.path);
    } else {
      onSelect(node);
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  }

  return (
    <div>
      <div
        style={{
          ...treeStyles.item,
          paddingLeft: `${12 + depth * 14}px`,
          background: isSelected ? theme.bgActive : "transparent",
          color: isSelected ? theme.accent : theme.textSecondary,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown size={12} color={theme.textMuted} style={{ flexShrink: 0 }} />
            ) : (
              <ChevronRight size={12} color={theme.textMuted} style={{ flexShrink: 0 }} />
            )}
            {isExpanded ? (
              <FolderOpen size={14} color={theme.accent} style={{ flexShrink: 0 }} />
            ) : (
              <Folder size={14} color={theme.accent} style={{ flexShrink: 0 }} />
            )}
          </>
        ) : (
          <>
            <span style={{ width: 12, flexShrink: 0 }} />
            <span style={{ color: theme.textMuted, flexShrink: 0 }}>{getFileIcon(node.name)}</span>
          </>
        )}
        <span style={treeStyles.itemName}>{node.name}</span>
      </div>
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
              theme={theme}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CONTEXT MENU (Right-click menu)
// ═══════════════════════════════════════════════════════
function ContextMenu({ x, y, node, onClose, onRename, onDelete, onNewFile, onNewFolder, onCopyPath, theme }) {
  const isFolder = node?.type === "folder";

  return (
    <>
      {/* Overlay */}
      <div
        style={contextMenuStyles.overlay}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu */}
      <div
        style={{
          ...contextMenuStyles.menu,
          left: x,
          top: y,
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadowMd,
        }}
      >
        {isFolder && (
          <>
            <button
              style={{ ...contextMenuStyles.item, color: theme.textSecondary }}
              onClick={() => {
                onNewFile(node);
                onClose();
              }}
            >
              <FilePlus size={13} />
              New File
            </button>
            <button
              style={{ ...contextMenuStyles.item, color: theme.textSecondary }}
              onClick={() => {
                onNewFolder(node);
                onClose();
              }}
            >
              <FolderPlus size={13} />
              New Folder
            </button>
            <div style={{ ...contextMenuStyles.divider, background: theme.border }} />
          </>
        )}

        <button
          style={{ ...contextMenuStyles.item, color: theme.textSecondary }}
          onClick={() => {
            onRename(node);
            onClose();
          }}
        >
          <Edit2 size={13} />
          Rename
        </button>

        <button
          style={{ ...contextMenuStyles.item, color: theme.textSecondary }}
          onClick={() => {
            onCopyPath(node);
            onClose();
          }}
        >
          <Copy size={13} />
          Copy Path
        </button>

        <div style={{ ...contextMenuStyles.divider, background: theme.border }} />

        <button
          style={{ ...contextMenuStyles.item, color: "#ef4444" }}
          onClick={() => {
            onDelete(node);
            onClose();
          }}
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// RENAME MODAL
// ═══════════════════════════════════════════════════════
function RenameModal({ node, onSave, onClose, theme }) {
  const [newName, setNewName] = useState(node.name);

  function handleSave() {
    if (newName.trim() && newName !== node.name) {
      onSave(node, newName.trim());
    }
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
        }}
      >
        <div style={modalStyles.header}>
          <span style={{ ...modalStyles.title, color: theme.textPrimary }}>
            Rename {node.type === "folder" ? "Folder" : "File"}
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
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
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
            style={{ ...modalStyles.saveBtn, background: theme.accent, color: "#fff" }}
            onClick={handleSave}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NEW FILE/FOLDER MODAL
// ═══════════════════════════════════════════════════════
function NewItemModal({ parentNode, type, onSave, onClose, theme }) {
  const [name, setName] = useState("");

  function handleSave() {
    if (name.trim()) {
      onSave(parentNode, name.trim(), type);
    }
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
        }}
      >
        <div style={modalStyles.header}>
          <span style={{ ...modalStyles.title, color: theme.textPrimary }}>
            New {type === "file" ? "File" : "Folder"}
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "file" ? "e.g., new-component.jsx" : "e.g., new-folder"}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
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
            style={{ ...modalStyles.saveBtn, background: theme.accent, color: "#fff" }}
            onClick={handleSave}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════
function DeleteConfirmModal({ node, onConfirm, onClose, theme }) {
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
          <span style={{ ...modalStyles.title, color: theme.error }}>
            Delete {node.type === "folder" ? "Folder" : "File"}
          </span>
          <button
            style={{ ...modalStyles.closeBtn, color: theme.textMuted }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <p style={{ ...modalStyles.message, color: theme.textSecondary }}>
          Are you sure you want to delete <strong>{node.name}</strong>?
          {node.type === "folder" && " This will delete all contents inside."}
          <br />
          <span style={{ color: theme.error, fontSize: "12px" }}>This action cannot be undone.</span>
        </p>
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
            style={{ ...modalStyles.saveBtn, background: "#ef4444", color: "#fff" }}
            onClick={() => {
              onConfirm(node);
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN FILE EXPLORER COMPONENT
// ═══════════════════════════════════════════════════════
export default function FileExplorer({ activeProject, onClose }) {
  const { theme, mode } = useTheme();
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);

  // 🆕 Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

  // 🆕 Context menu states
  const [contextMenu, setContextMenu] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [newItemModal, setNewItemModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    if (activeProject) loadTree();
  }, [activeProject?.id]);

  async function loadTree() {
    setLoading(true);
    const result = await window.electronAPI.listFilesTree(activeProject.path);
    if (result.success) {
      setTree(result.tree);
      setExpanded(new Set(result.tree.filter((n) => n.type === "folder").map((n) => n.path)));
    }
    setLoading(false);
  }

  function toggleFolder(path) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function selectFile(node) {
    // اگر edit mode میں ہیں تو پہلے save/discard کریں
    if (isEditing) {
      const confirm = window.confirm("You have unsaved changes. Discard them?");
      if (!confirm) return;
      setIsEditing(false);
    }

    setSelectedFile(node);
    setLoadingContent(true);
    const result = await window.electronAPI.readFileContent(activeProject.path, node.path);
    if (result.success) {
      setFileContent(result.content);
    } else {
      setFileContent(`Error: ${result.error}`);
    }
    setLoadingContent(false);
  }

  function copyContent() {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 🆕 Edit mode start
  function startEditing() {
    setIsEditing(true);
    setEditedContent(fileContent);
  }

  // 🆕 Save changes
  async function saveChanges() {
    if (!selectedFile) return;
    
    setSaving(true);
    const result = await window.electronAPI.saveFileContent(
      activeProject.path,
      selectedFile.path,
      editedContent
    );
    
    if (result.success) {
      setFileContent(editedContent);
      setIsEditing(false);
    } else {
      alert(`Error saving file: ${result.error}`);
    }
    setSaving(false);
  }

  // 🆕 Cancel editing
  function cancelEditing() {
    setIsEditing(false);
    setEditedContent("");
  }

  // 🆕 Context menu handlers
  function handleContextMenu(e, node) {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  }

  async function handleRename(node, newName) {
    const parentPath = node.path.substring(0, node.path.lastIndexOf("/"));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    const result = await window.electronAPI.renameFile(
      activeProject.path,
      node.path,
      newName
    );
    
    if (result.success) {
      await loadTree();
      if (selectedFile?.path === node.path) {
        setSelectedFile(null);
        setFileContent("");
      }
    } else {
      alert(`Error renaming: ${result.error}`);
    }
  }

  async function handleDelete(node) {
    const result = await window.electronAPI.deleteFileOrFolder(
      activeProject.path,
      node.path
    );
    
    if (result.success) {
      await loadTree();
      if (selectedFile?.path === node.path) {
        setSelectedFile(null);
        setFileContent("");
      }
    } else {
      alert(`Error deleting: ${result.error}`);
    }
  }

  async function handleNewFile(parentNode, name, type) {
    const parentPath = parentNode.path || "";
    const newPath = parentPath ? `${parentPath}/${name}` : name;
    
    let result;
    if (type === "file") {
      result = await window.electronAPI.createNewFile(activeProject.path, newPath, "");
    } else {
      result = await window.electronAPI.createNewFolder(activeProject.path, newPath);
    }
    
    if (result.success) {
      await loadTree();
      // نئی بنی ہوئی folder کو expand کریں
      if (type === "folder") {
        setExpanded((prev) => new Set([...prev, newPath]));
      }
    } else {
      alert(`Error creating ${type}: ${result.error}`);
    }
  }

  function handleCopyPath(node) {
    navigator.clipboard.writeText(node.path);
  }

  return (
    <div style={{ ...styles.container, background: theme.bgMain }}>
      {/* Modals */}
      {renameModal && (
        <RenameModal
          node={renameModal.node}
          onSave={handleRename}
          onClose={() => setRenameModal(null)}
          theme={theme}
        />
      )}
      {newItemModal && (
        <NewItemModal
          parentNode={newItemModal.parentNode}
          type={newItemModal.type}
          onSave={handleNewFile}
          onClose={() => setNewItemModal(null)}
          theme={theme}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          node={deleteModal.node}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
          theme={theme}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onRename={(node) => setRenameModal({ node })}
          onDelete={(node) => setDeleteModal({ node })}
          onNewFile={(node) => setNewItemModal({ parentNode: node, type: "file" })}
          onNewFolder={(node) => setNewItemModal({ parentNode: node, type: "folder" })}
          onCopyPath={handleCopyPath}
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
        <Folder size={16} color={theme.accent} />
        <span style={{ ...styles.headerTitle, color: theme.textPrimary }}>
          Files — {activeProject?.name}
        </span>
        <div style={{ flex: 1 }} />
        <button
          style={{ ...styles.iconBtn, color: theme.textMuted }}
          onClick={loadTree}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
        <button
          style={{ ...styles.iconBtn, color: theme.textMuted }}
          onClick={onClose}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body: Tree + Preview */}
      <div style={styles.body}>
        {/* Left: Tree */}
        <div
          style={{
            ...styles.treePanel,
            background: theme.bgSidebar,
            borderRight: `1px solid ${theme.border}`,
          }}
        >
          <div style={styles.treeHeader}>
            <span style={{ ...styles.treeTitle, color: theme.textMuted }}>
              EXPLORER
            </span>
          </div>
          <div style={styles.treeContent}>
            {loading ? (
              <div style={{ ...styles.empty, color: theme.textMuted }}>
                Loading...
              </div>
            ) : tree.length === 0 ? (
              <div style={{ ...styles.empty, color: theme.textMuted }}>
                No files found
              </div>
            ) : (
              tree.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggleFolder}
                  onSelect={selectFile}
                  selectedPath={selectedFile?.path}
                  theme={theme}
                  onContextMenu={handleContextMenu}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div style={styles.previewPanel}>
          {selectedFile ? (
            <>
              {/* File Header */}
              <div
                style={{
                  ...styles.fileHeader,
                  background: theme.bgCard,
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                <span style={{ color: theme.textMuted }}>{getFileIcon(selectedFile.name)}</span>
                <span style={{ ...styles.filePath, color: theme.textSecondary }}>
                  {selectedFile.path}
                </span>
                <div style={{ flex: 1 }} />

                {/* Edit/Save/Cancel buttons */}
                {isEditing ? (
                  <>
                    <button
                      style={{
                        ...styles.editBtn,
                        background: theme.success,
                        color: "#fff",
                      }}
                      onClick={saveChanges}
                      disabled={saving}
                    >
                      {saving ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      style={{
                        ...styles.editBtn,
                        background: theme.bgHover,
                        color: theme.textSecondary,
                      }}
                      onClick={cancelEditing}
                    >
                      <X size={12} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    style={{
                      ...styles.editBtn,
                      background: theme.accent,
                      color: "#fff",
                    }}
                    onClick={startEditing}
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                )}

                <button
                  style={{
                    ...styles.copyBtn,
                    color: copied ? theme.success : theme.textMuted,
                    background: copied ? theme.successBg : "transparent",
                  }}
                  onClick={copyContent}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {/* File Content */}
              <div style={styles.fileContent}>
                {loadingContent ? (
                  <div style={{ ...styles.empty, color: theme.textMuted }}>
                    Loading...
                  </div>
                ) : isEditing ? (
                  // Edit mode — textarea
                  <textarea
                    style={{
                      ...styles.editor,
                      background: theme.bgInput,
                      color: theme.textPrimary,
                      border: `1px solid ${theme.border}`,
                    }}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  // View mode — syntax highlighter
                  <SyntaxHighlighter
                    language={getLanguage(selectedFile.name)}
                    style={mode === "dark" ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      padding: "16px 20px",
                      background: "transparent",
                      fontSize: "13px",
                      lineHeight: "1.7",
                      height: "100%",
                      overflow: "auto",
                    }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                )}
              </div>
            </>
          ) : (
            <div style={styles.emptyPreview}>
              <File size={40} color={theme.textMuted} />
              <span style={{ color: theme.textMuted, fontSize: "13px" }}>
                Select a file to preview
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "14px",
    fontWeight: "600",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "6px",
    borderRadius: "6px",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  treePanel: {
    width: "280px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
  },
  treeHeader: {
    padding: "10px 14px 6px",
    flexShrink: 0,
  },
  treeTitle: {
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  treeContent: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
  },
  previewPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  fileHeader: {
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  filePath: {
    fontSize: "12px",
    fontFamily: "Monaco, Menlo, monospace",
  },
  editBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
  },
  copyBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    border: "none",
    cursor: "pointer",
  },
  fileContent: {
    flex: 1,
    overflow: "auto",
    background: "transparent",
  },
  editor: {
    width: "100%",
    height: "100%",
    padding: "16px 20px",
    fontSize: "13px",
    fontFamily: "Monaco, Menlo, 'Courier New', monospace",
    lineHeight: "1.7",
    resize: "none",
    outline: "none",
    boxSizing: "border-box",
  },
  empty: {
    padding: "20px",
    fontSize: "12px",
    textAlign: "center",
  },
  emptyPreview: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
};

const treeStyles = {
  item: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "13px",
    userSelect: "none",
    transition: "background 0.1s",
  },
  itemName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

const contextMenuStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
  },
  menu: {
    position: "fixed",
    borderRadius: "8px",
    padding: "4px",
    minWidth: "160px",
    zIndex: 1000,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "none",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    width: "100%",
    textAlign: "left",
  },
  divider: {
    height: "1px",
    margin: "4px 8px",
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
    zIndex: 2000,
  },
  modal: {
    borderRadius: "12px",
    padding: "20px",
    width: "360px",
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
  message: {
    fontSize: "13px",
    lineHeight: "1.6",
    margin: 0,
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
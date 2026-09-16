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

// فائل کی extension سے language detect کریں (syntax highlight کے لیے)
function getLanguage(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
    py: "python", java: "java", cpp: "cpp", c: "c", go: "go", rs: "rust",
    md: "markdown", json: "json", yaml: "yaml", yml: "yaml",
    html: "html", css: "css", scss: "scss", xml: "xml",
    sh: "bash", bash: "bash", sql: "sql",
  };
  return map[ext] || "text";
}

// Tree Node (recursive)
function TreeNode({ node, depth, expanded, onToggle, onSelect, selectedPath, theme }) {
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({ activeProject, onClose }) {
  const { theme, mode } = useTheme();
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeProject) loadTree();
  }, [activeProject?.id]);

  async function loadTree() {
    setLoading(true);
    const result = await window.electronAPI.listFilesTree(activeProject.path);
    if (result.success) {
      setTree(result.tree);
      // root folder کو default کھولیں
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

  return (
    <div style={{ ...styles.container, background: theme.bgMain }}>
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
                ) : (
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
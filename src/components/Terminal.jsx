import { useState, useEffect, useRef } from "react";
import { useTheme } from "../ThemeContext";
import { X, Terminal as TerminalIcon, Trash2 } from "lucide-react";

export default function Terminal({ activeProject, onClose }) {
  const { theme } = useTheme();
  const [history, setHistory] = useState([
    { type: "system", text: "Terminal ready. Type a command to start." },
  ]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    if (activeProject) {
      setHistory([
        {
          type: "system",
          text: `Terminal ready — ${activeProject.name}\n${activeProject.path}`,
        },
      ]);
    }
  }, [activeProject?.id]);

  async function runCommand(cmd) {
    if (!cmd.trim()) return;

    // history میں شامل کریں
    setCommandHistory((prev) => [cmd, ...prev]);
    setHistoryIndex(-1);

    setHistory((prev) => [
      ...prev,
      { type: "input", text: `$ ${cmd}` },
    ]);

    setInput("");
    setIsRunning(true);

    const result = await window.electronAPI.runTerminalCommand(
      cmd,
      activeProject?.path || ""
    );

    setHistory((prev) => [
      ...prev,
      {
        type: result.success ? "output" : "error",
        text: result.output || result.error || "",
      },
    ]);

    setIsRunning(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand(input);
    }

    // اوپر کا arrow — پچھلی command
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || "");
    }

    // نیچے کا arrow — اگلی command
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? "" : commandHistory[newIndex] || "");
    }
  }

  function clearTerminal() {
    setHistory([{ type: "system", text: "Terminal cleared." }]);
  }

  return (
    <div
      style={{
        ...styles.container,
        background: "#1a1a1a",
      }}
      onClick={() => inputRef.current?.focus()}
    >

      {/* Header */}
<div
  style={{
    ...styles.header,
    background: "#1a1a1a",
    borderBottom: "1px solid #333",
  }}
  >
  <TerminalIcon size={15} color="#4ade80" />
  <span style={{ ...styles.headerTitle, color: "#ffffff" }}>
    Terminal
  </span>
  {activeProject && (
    <span style={{ ...styles.projectBadge, color: "#888" }}>
      {activeProject.name}
    </span>
  )}
  <button
    style={{ ...styles.clearBtn, color: "#888" }}
    onClick={clearTerminal}
    title="Clear terminal"
    >
    Clear
    </button>
    <button
    style={{ ...styles.clearBtn, color: "#888" }}
    onClick={onClose}
    title="Close terminal"
    >
    <X size={15} />
  </button>
</div>

      {/* Output */}
      <div style={styles.output}>
        {history.map((item, index) => (
          <div
            key={index}
            style={{
              ...styles.line,
              color:
              item.type === "input"
              ? "#4ade80"
              : item.type === "error"
              ? "#f87171"
              : item.type === "system"
              ? "#888"
              : "#e0e0e0",
            }}
          >
            <pre style={styles.lineText}>{item.text}</pre>
          </div>
        ))}

        {isRunning && (
          <div style={{ ...styles.line, color: theme.textMuted }}>
            <pre style={styles.lineText}>Running...</pre>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div
        style={{
            ...styles.inputArea,
            background: "#111",
            borderTop: "1px solid #333",
          }}
        >
          <span style={{ ...styles.prompt, color: "#4ade80" }}>
            {activeProject ? `${activeProject.name} $` : "$"}
          </span>
          <input
            ref={inputRef}
            style={{
              ...styles.input,
              color: "#e0e0e0",
              background: "transparent",
            }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeProject
              ? "Type a command..."
              : "Select a project first..."
          }
          disabled={isRunning || !activeProject}
          autoFocus
        />
      </div>

      <style>{`
        .terminal-output::-webkit-scrollbar {
          width: 6px;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    cursor: "text",
  },
  header: {
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "14px",
    fontWeight: "600",
    flex: 1,
  },
  projectBadge: {
    fontSize: "11px",
    fontFamily: "Monaco, Menlo, monospace",
  },
  clearBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    borderRadius: "6px",
  },
  output: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  line: {
    fontSize: "13px",
    lineHeight: "1.6",
  },
  lineText: {
    margin: 0,
    fontFamily: "Monaco, Menlo, 'Courier New', monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  inputArea: {
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  prompt: {
    fontFamily: "Monaco, Menlo, monospace",
    fontSize: "13px",
    fontWeight: "600",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontFamily: "Monaco, Menlo, monospace",
    fontSize: "13px",
    lineHeight: "1.6",
  },
};

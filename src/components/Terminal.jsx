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
  }, [history, input]);

  useEffect(() => {
    if (activeProject) {
      setHistory([
        {
          type: "system",
          text: `Terminal ready — ${activeProject.name}\n${activeProject.path}`,
        },
      ]);
    }
    // Focus on input after render
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeProject?.id]);

  async function runCommand(cmd) {
    if (!cmd.trim()) return;
    
    setCommandHistory((prev) => [cmd, ...prev]);
    setHistoryIndex(-1);
    
    setHistory((prev) => [
      ...prev,
      { type: "input", text: cmd },
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
    
    // Refocus after command
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand(input);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex] || "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? "" : commandHistory[newIndex] || "");
    }
  }

  function handleClear() {
    setHistory([{ type: "system", text: "Terminal cleared." }]);
    setInput("");
    inputRef.current?.focus();
  }

  function handleClose() {
    if (onClose) {
      onClose();
    }
  }

  const promptText = activeProject ? `${activeProject.name} $ ` : "$ ";

  return (
    <div
      style={{
        ...styles.container,
        background: "#1a1a1a",
      }}
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
        
        {/* Clear Button */}
        <button
          style={styles.headerBtn}
          onClick={handleClear}
          title="Clear terminal"
        >
          <Trash2 size={14} />
          <span style={styles.btnText}>Clear</span>
        </button>
        
        {/* Close Button */}
        <button
          style={styles.headerBtn}
          onClick={handleClose}
          title="Close terminal"
        >
          <X size={15} />
        </button>
      </div>

      {/* Output Area */}
      <div style={styles.output} onClick={() => inputRef.current?.focus()}>
        {history.map((item, index) => {
          if (item.type === "input") {
            return (
              <div key={index} style={styles.inputLine}>
                <span style={styles.prompt}>{promptText}</span>
                <span style={styles.inputText}>{item.text}</span>
              </div>
            );
          }
          return (
            <div
              key={index}
              style={{
                ...styles.outputLine,
                color:
                  item.type === "error"
                    ? "#f87171"
                    : item.type === "system"
                    ? "#888"
                    : "#e0e0e0",
              }}
            >
              <pre style={styles.pre}>{item.text}</pre>
            </div>
          );
        })}
        {isRunning && (
          <div style={{ ...styles.outputLine, color: "#888" }}>
            <pre style={styles.pre}>Running...</pre>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Line */}
      <div style={styles.inputArea} onClick={() => inputRef.current?.focus()}>
        <span style={styles.prompt}>{promptText}</span>
        <input
          ref={inputRef}
          style={styles.input}
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
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
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
    marginRight: "8px",
  },
  headerBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    borderRadius: "6px",
    color: "#888",
    fontSize: "12px",
  },
  btnText: {
    fontSize: "12px",
  },
  output: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    cursor: "text",
  },
  inputLine: {
    display: "flex",
    alignItems: "center",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  outputLine: {
    fontSize: "13px",
    lineHeight: "1.6",
  },
  pre: {
    margin: 0,
    fontFamily: "Monaco, Menlo, 'Courier New', monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  prompt: {
    fontFamily: "Monaco, Menlo, monospace",
    fontSize: "13px",
    fontWeight: "600",
    color: "#4ade80",
    flexShrink: 0,
    marginRight: "8px",
  },
  inputText: {
    fontFamily: "Monaco, Menlo, monospace",
    fontSize: "13px",
    color: "#e0e0e0",
  },
  inputArea: {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    borderTop: "1px solid #333",
    background: "#1a1a1a",
    flexShrink: 0,
    cursor: "text",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    fontFamily: "Monaco, Menlo, monospace",
    fontSize: "13px",
    color: "#e0e0e0",
    lineHeight: "1.6",
  },
};
import { useEffect, useRef, useState } from "react";
import { Bot, User, FileText, Edit, List, Search, Terminal, Check, Loader, Copy } from "lucide-react";
import { useTheme } from "../ThemeContext";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// ═══════════════════════════════════════════════════════
// CODE BLOCK COMPONENT
// ═══════════════════════════════════════════════════════
function CodeBlock({ language, code, theme, mode }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        ...codeStyles.container,
        background: mode === "dark" ? "#1a1a2e" : "#f8f8f8",
        border: `1px solid ${theme.border}`,
      }}
    >
      <div
        style={{
          ...codeStyles.header,
          background: mode === "dark" ? "#16213e" : "#f0f0f0",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <span style={{ ...codeStyles.language, color: theme.textMuted }}>
          {language || "code"}
        </span>
        <button
          style={{
            ...codeStyles.copyBtn,
            color: copied ? theme.success : theme.textMuted,
            background: copied ? theme.successBg : "transparent",
          }}
          onClick={copyCode}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {/* ✅ FIX: Code block ہمیشہ LTR رہے گا — Urdu text بھی */}
      <div style={{ direction: "ltr", textAlign: "left" }}>
        <SyntaxHighlighter
          language={language || "javascript"}
          style={mode === "dark" ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: "14px 16px",
            background: "transparent",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TOOL STATUS COMPONENT
// ═══════════════════════════════════════════════════════
function ToolStatusItem({ tool, status, input, theme }) {
  const getToolInfo = () => {
    switch (tool) {
      case "read_file":
        return { icon: <FileText size={12} />, label: `Reading: ${input.file_path}` };
      case "write_file":
        return { icon: <Edit size={12} />, label: `Writing: ${input.file_path}` };
      case "list_files":
        return { icon: <List size={12} />, label: `Listing files${input.sub_path ? `: ${input.sub_path}` : ""}` };
      case "search_files":
        return { icon: <Search size={12} />, label: `Searching: ${input.search_term}` };
      case "run_command":
        return { icon: <Terminal size={12} />, label: `Running: ${input.command}` };
      default:
        return { icon: <Bot size={12} />, label: tool };
    }
  };

  const { icon, label } = getToolInfo();
  const isDone = status === "done";

  return (
    <div style={toolStyles.item}>
      <span style={toolStyles.statusIcon}>
        {isDone ? (
          <Check size={12} color={theme.success} />
        ) : (
          <Loader size={12} color={theme.accent} style={{ animation: "spin 1s linear infinite" }} />
        )}
      </span>
      <span style={{ ...toolStyles.toolIcon, color: theme.textMuted }}>{icon}</span>
      <span style={{ ...toolStyles.label, color: isDone ? theme.textMuted : theme.textSecondary }}>
        {label}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// URDU DETECTION
// ═══════════════════════════════════════════════════════
function isUrduText(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

// ═══════════════════════════════════════════════════════
// AGENT MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════
function AgentMessage({ content, theme, mode }) {
  const hasUrdu = isUrduText(content);

  return (
    <div
      style={{
        ...agentStyles.container,
        color: theme.textPrimary,
        fontFamily: hasUrdu
          ? "'Noto Nastaliq Urdu', serif"
          : "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        fontWeight: hasUrdu ? 500 : 400,
        lineHeight: hasUrdu ? "1.9" : "1.7",
        direction: hasUrdu ? "rtl" : "ltr",
        textAlign: hasUrdu ? "right" : "left",
      }}
    >
      <ReactMarkdown
        components={{
          // Code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const code = String(children).replace(/\n$/, "");

            if (!inline && (match || code.includes("\n"))) {
              return (
                <CodeBlock
                  language={language}
                  code={code}
                  theme={theme}
                  mode={mode}
                />
              );
            }
            return (
              <code
                style={{
                  ...agentStyles.inlineCode,
                  background: theme.bgHover,
                  color: theme.accent,
                  border: `1px solid ${theme.border}`,
                  // ✅ FIX: Inline code ہمیشہ LTR
                  direction: "ltr",
                  unicodeBidi: "embed",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Paragraphs
          p({ children }) {
            return <p style={agentStyles.paragraph}>{children}</p>;
          },
          // Headings
          h1({ children }) {
            return <h1 style={{ ...agentStyles.heading, fontSize: "20px" }}>{children}</h1>;
          },
          h2({ children }) {
            return <h2 style={{ ...agentStyles.heading, fontSize: "17px" }}>{children}</h2>;
          },
          h3({ children }) {
            return <h3 style={{ ...agentStyles.heading, fontSize: "15px" }}>{children}</h3>;
          },
          // Lists
          ul({ children }) {
            return <ul style={agentStyles.list}>{children}</ul>;
          },
          ol({ children }) {
            return <ol style={agentStyles.list}>{children}</ol>;
          },
          li({ children }) {
            return <li style={agentStyles.listItem}>{children}</li>;
          },
          // Bold
          strong({ children }) {
            return (
              <strong style={{ fontWeight: "600", color: theme.textPrimary }}>
                {children}
              </strong>
            );
          },
          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote
                style={{
                  ...agentStyles.blockquote,
                  borderLeft: hasUrdu ? "none" : `3px solid ${theme.accent}`,
                  borderRight: hasUrdu ? `3px solid ${theme.accent}` : "none",
                  background: theme.accentLight,
                  color: theme.textSecondary,
                }}
              >
                {children}
              </blockquote>
            );
          },
          // Horizontal rule
          hr() {
            return (
              <hr style={{ border: "none", borderTop: `1px solid ${theme.border}`, margin: "16px 0" }} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN MESSAGE LIST COMPONENT
// ═══════════════════════════════════════════════════════
export default function MessageList({ messages, isThinking, toolStatuses, streamingContent }) {
  const { theme, mode } = useTheme();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, toolStatuses, streamingContent]);

  return (
    <div style={{ ...styles.container, background: theme.bgMain }}>
      {messages.map((msg, index) => (
        <div key={index}>
          {/* ─── USER MESSAGE ─── */}
          {msg.role === "user" && (
            <div style={styles.userWrapper}>
              <div
                style={{
                  ...styles.userCard,
                  background: theme.msgUser,
                  color: theme.msgUserText,
                  position: "relative",
                }}
              >
                <div style={styles.userContent}>{msg.content}</div>
                <button
                  style={{
                    position: "absolute",
                    bottom: "6px",
                    right: "8px",
                    // ✅ FIX: "theme.shadow" (string) → theme.shadow (variable)
                    background: theme.shadow,
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    // ✅ FIX: "textPrimary" (string) → theme.textPrimary (variable)
                    color: theme.textPrimary,
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                  }}
                  title="Copy message"
                >
                  <Copy size={11} />
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* ─── AGENT MESSAGE ─── */}
          {msg.role === "agent" && (
            <div style={styles.agentWrapper}>
              <div
                style={{
                  ...styles.agentAvatar,
                  background: theme.bgHover,
                  color: theme.textSecondary,
                }}
              >
                <Bot size={15} />
              </div>
              <div style={styles.agentContent}>
                <span style={{ ...styles.agentName, color: theme.textMuted }}>
                  Coder
                </span>
                <AgentMessage content={msg.content} theme={theme} mode={mode} />
              </div>
            </div>
          )}

          {/* ─── SYSTEM MESSAGE ─── */}
          {msg.role === "system" && (
            <div style={styles.systemWrapper}>
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <span
                  style={{
                    ...styles.systemMsg,
                    background: theme.errorBg,
                    color: theme.error,
                    display: "block",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxWidth: "500px",
                  }}
                >
                  {msg.content}
                </span>
                <button
                  style={{
                    position: "absolute",
                    bottom: "4px",
                    right: "6px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "2px",
                    color: theme.error,
                    opacity: 0.7,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                  }}
                  title="Copy error"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ─── THINKING INDICATOR ─── */}
      {isThinking && (
        <div style={styles.agentWrapper}>
          <div
            style={{
              ...styles.agentAvatar,
              background: theme.bgHover,
              color: theme.textSecondary,
            }}
          >
            <Bot size={15} />
          </div>
          <div style={styles.agentContent}>
            <span style={{ ...styles.agentName, color: theme.textMuted }}>
              Coder
            </span>
            {/* Streaming content */}
            {streamingContent ? (
              <AgentMessage
                content={streamingContent}
                theme={theme}
                mode={mode}
              />
            ) : toolStatuses && toolStatuses.length > 0 ? (
              <div style={toolStyles.container}>
                {toolStatuses.map((ts, i) => (
                  <ToolStatusItem
                    key={i}
                    tool={ts.tool}
                    status={ts.status}
                    input={ts.input}
                    theme={theme}
                  />
                ))}
              </div>
            ) : (
              <div style={styles.thinkingDots}>
                <span style={{ ...styles.dot, background: theme.textMuted, animationDelay: "0ms" }} />
                <span style={{ ...styles.dot, background: theme.textMuted, animationDelay: "150ms" }} />
                <span style={{ ...styles.dot, background: theme.textMuted, animationDelay: "300ms" }} />
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={endRef} />

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
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
    overflowY: "auto",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  userWrapper: {
    display: "flex",
    justifyContent: "flex-end",
  },
  userCard: {
    maxWidth: "70%",
    padding: "10px 16px",
    borderRadius: "18px",
    borderBottomRightRadius: "4px",
    fontSize: "14px",
    lineHeight: "1.6",
    fontFamily: "'Segoe UI', 'Noto Nastaliq Urdu', Arial, sans-serif",
  },
  userContent: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    lineHeight: "1.7",
  },
  agentWrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  agentAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "2px",
  },
  agentContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  },
  agentName: {
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  systemWrapper: {
    display: "flex",
    justifyContent: "center",
  },
  systemMsg: {
    padding: "4px 14px",
    borderRadius: "20px",
    fontSize: "12px",
  },
  thinkingDots: {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    padding: "4px 0",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    display: "inline-block",
    animation: "dotBounce 1.2s infinite ease-in-out",
  },
};

const agentStyles = {
  container: {
    fontSize: "15px",
    lineHeight: "1.8",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    userSelect: "text",
    cursor: "text",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  paragraph: {
    margin: "0 0 12px 0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: "1.8",
  },
  heading: {
    fontWeight: "700",
    margin: "16px 0 8px 0",
    lineHeight: "1.4",
  },
  list: {
    margin: "0 0 12px 0",
    paddingLeft: "20px",
  },
  listItem: {
    margin: "4px 0",
    lineHeight: "1.6",
  },
  inlineCode: {
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "13px",
    fontFamily: "Monaco, Menlo, monospace",
  },
  blockquote: {
    margin: "12px 0",
    padding: "8px 14px",
    borderRadius: "0 8px 8px 0",
  },
};

const codeStyles = {
  container: {
    borderRadius: "10px",
    overflow: "hidden",
    margin: "10px 0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
  },
  language: {
    fontSize: "11px",
    fontFamily: "Monaco, Menlo, monospace",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  copyBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    padding: "3px 8px",
    borderRadius: "5px",
  },
};

const toolStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "4px 0",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusIcon: {
    display: "flex",
    alignItems: "center",
    width: "16px",
    flexShrink: 0,
  },
  toolIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  label: {
    fontFamily: "Monaco, Menlo, monospace",
    fontSize: "11px",
  },
};

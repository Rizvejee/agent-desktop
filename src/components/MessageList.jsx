import { useEffect, useRef } from "react";
import {
  Bot,
  User,
  FileText,
  Edit,
  List,
  Search,
  Terminal,
  Check,
  Loader,
} from "lucide-react";
import { useTheme } from "../ThemeContext";

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
          <Loader
            size={12}
            color={theme.accent}
            style={{ animation: "spin 1s linear infinite" }}
          />
        )}
      </span>
      <span style={{ ...toolStyles.toolIcon, color: theme.textMuted }}>
        {icon}
      </span>
      <span
        style={{
          ...toolStyles.label,
          color: isDone ? theme.textMuted : theme.textSecondary,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function MessageList({ messages, isThinking, toolStatuses }) {
  const { theme } = useTheme();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, toolStatuses]);

  return (
    <div
      style={{
        ...styles.container,
        background: theme.bgMain,
      }}
    >
      {messages.map((msg, index) => (
        <div
          key={index}
          style={{
            ...styles.messageWrapper,
            ...(msg.role === "user"
              ? styles.wrapperUser
              : styles.wrapperAgent),
          }}
        >
          {msg.role !== "system" && (
            <div
              style={{
                ...styles.avatar,
                ...(msg.role === "user"
                  ? { background: theme.accent, color: theme.textInverse }
                  : { background: theme.bgHover, color: theme.textSecondary }),
              }}
            >
              {msg.role === "user" ? (
                <User size={14} />
              ) : (
                <Bot size={14} />
              )}
            </div>
          )}

          <div
            style={{
              ...styles.bubble,
              ...(msg.role === "user"
                ? {
                    background: theme.msgUser,
                    color: theme.msgUserText,
                    borderTopRightRadius: "4px",
                  }
                : msg.role === "agent"
                ? {
                    background: theme.msgAgent,
                    color: theme.msgAgentText,
                    border: `1px solid ${theme.msgAgentBorder}`,
                    borderTopLeftRadius: "4px",
                    boxShadow: theme.shadow,
                  }
                : {
                    background: theme.successBg,
                    color: theme.success,
                    borderRadius: "20px",
                    padding: "6px 16px",
                    fontSize: "12px",
                  }),
            }}
          >
            {msg.role !== "system" && (
              <div
                style={{
                  ...styles.senderName,
                  color:
                    msg.role === "user"
                      ? "rgba(255,255,255,0.7)"
                      : theme.textMuted,
                }}
              >
                {msg.role === "user" ? "You" : "Coder"}
              </div>
            )}
            <div style={styles.content}>{msg.content}</div>
          </div>
        </div>
      ))}

      {/* Thinking / Tool Status */}
      {isThinking && (
        <div style={styles.messageWrapper}>
          <div
            style={{
              ...styles.avatar,
              background: theme.bgHover,
              color: theme.textSecondary,
            }}
          >
            <Bot size={14} />
          </div>
          <div
            style={{
              ...styles.bubble,
              background: theme.msgAgent,
              border: `1px solid ${theme.msgAgentBorder}`,
              borderTopLeftRadius: "4px",
              boxShadow: theme.shadow,
              color: theme.msgAgentText,
              minWidth: "220px",
            }}
          >
            <div
              style={{
                ...styles.senderName,
                color: theme.textMuted,
              }}
            >
              Coder
            </div>

            {toolStatuses && toolStatuses.length > 0 ? (
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
                <span
                  style={{
                    ...styles.dot,
                    background: theme.textMuted,
                    animationDelay: "0ms",
                  }}
                />
                <span
                  style={{
                    ...styles.dot,
                    background: theme.textMuted,
                    animationDelay: "150ms",
                  }}
                />
                <span
                  style={{
                    ...styles.dot,
                    background: theme.textMuted,
                    animationDelay: "300ms",
                  }}
                />
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

const styles = {
  container: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  messageWrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  wrapperUser: { flexDirection: "row-reverse" },
  wrapperAgent: { flexDirection: "row" },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: "16px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  senderName: {
    fontSize: "11px",
    fontWeight: "600",
    marginBottom: "5px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  content: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  thinkingDots: {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    marginTop: "4px",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    display: "inline-block",
    animation: "dotBounce 1.2s infinite ease-in-out",
  },
};

const toolStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "4px",
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
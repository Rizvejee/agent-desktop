import { useEffect, useRef } from "react";
import { Bot, User, FileText, Edit, List, Search, Terminal, Check, Loader } from "lucide-react";

function ToolStatusItem({ tool, status, input }) {
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

  return (
    <div style={toolStyles.item}>
      <span style={toolStyles.icon}>
        {status === "done" ? (
          <Check size={12} color="#16a34a" />
        ) : (
          <Loader size={12} color="#2563eb" style={{ animation: "spin 1s linear infinite" }} />
        )}
      </span>
      <span style={toolStyles.toolIcon}>{icon}</span>
      <span
        style={{
          ...toolStyles.label,
          color: status === "done" ? "#888" : "#444",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function MessageList({ messages, isThinking, toolStatuses }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, toolStatuses]);

  return (
    <div style={styles.container}>
      {messages.map((msg, index) => (
        <div
          key={index}
          style={{
            ...styles.messageWrapper,
            ...(msg.role === "user" ? styles.wrapperUser : styles.wrapperAgent),
          }}
        >
          {msg.role !== "system" && (
            <div
              style={{
                ...styles.avatar,
                ...(msg.role === "user" ? styles.avatarUser : styles.avatarAgent),
              }}
            >
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
          )}

          <div
            style={{
              ...styles.bubble,
              ...(msg.role === "user"
                ? styles.bubbleUser
                : msg.role === "agent"
                ? styles.bubbleAgent
                : styles.bubbleSystem),
            }}
          >
            {msg.role !== "system" && (
              <div style={styles.senderName}>
                {msg.role === "user" ? "You" : "Coder"}
              </div>
            )}
            <div style={styles.content}>{msg.content}</div>
          </div>
        </div>
      ))}

      {/* Tool Status */}
      {isThinking && (
        <div style={styles.messageWrapper}>
          <div style={styles.avatarAgent}>
            <Bot size={14} />
          </div>
          <div style={styles.thinkingBubble}>
            <div style={styles.senderName}>Coder</div>

            {toolStatuses && toolStatuses.length > 0 ? (
              <div style={toolStyles.container}>
                {toolStatuses.map((ts, i) => (
                  <ToolStatusItem
                    key={i}
                    tool={ts.tool}
                    status={ts.status}
                    input={ts.input}
                  />
                ))}
              </div>
            ) : (
              <div style={styles.thinkingDots}>
                <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                <span style={{ ...styles.dot, animationDelay: "150ms" }} />
                <span style={{ ...styles.dot, animationDelay: "300ms" }} />
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
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarUser: { background: "#2563eb", color: "#fff" },
  avatarAgent: {
    background: "#f0f0f0",
    color: "#555",
    width: "30px",
    height: "30px",
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
  bubbleUser: {
    background: "#2563eb",
    color: "#fff",
    borderTopRightRadius: "4px",
  },
  bubbleAgent: {
    background: "#ffffff",
    color: "#1a1a1a",
    border: "1px solid #ebebeb",
    borderTopLeftRadius: "4px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  bubbleSystem: {
    background: "#f0fdf4",
    color: "#16a34a",
    borderRadius: "20px",
    padding: "6px 16px",
    fontSize: "12px",
    alignSelf: "center",
  },
  senderName: {
    fontSize: "11px",
    fontWeight: "600",
    opacity: 0.5,
    marginBottom: "4px",
  },
  content: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
  thinkingBubble: {
    background: "#ffffff",
    border: "1px solid #ebebeb",
    borderRadius: "16px",
    borderTopLeftRadius: "4px",
    padding: "12px 16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    minWidth: "200px",
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
    background: "#aaa",
    display: "inline-block",
    animation: "dotBounce 1.2s infinite ease-in-out",
  },
};

const toolStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "6px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
  },
  icon: {
    display: "flex",
    alignItems: "center",
    width: "16px",
  },
  toolIcon: {
    display: "flex",
    alignItems: "center",
    color: "#888",
  },
  label: {
    fontFamily: "Monaco, Menlo, monospace",
    fontSize: "11px",
  },
};
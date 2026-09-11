import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";

export default function MessageList({ messages, isThinking }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div style={styles.container}>
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
          {/* Avatar */}
          {msg.role !== "system" && (
            <div
              style={{
                ...styles.avatar,
                ...(msg.role === "user"
                  ? styles.avatarUser
                  : styles.avatarAgent),
              }}
            >
              {msg.role === "user" ? (
                <User size={14} />
              ) : (
                <Bot size={14} />
              )}
            </div>
          )}

          {/* Message bubble */}
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

      {/* Thinking indicator */}
      {isThinking && (
        <div style={styles.messageWrapper}>
          <div style={styles.avatarAgent}>
            <Bot size={14} />
          </div>
          <div style={styles.thinkingBubble}>
            <div style={styles.senderName}>Coder</div>
            <div style={styles.thinkingDots}>
              <span style={{ ...styles.dot, animationDelay: "0ms" }} />
              <span style={{ ...styles.dot, animationDelay: "150ms" }} />
              <span style={{ ...styles.dot, animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
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
  wrapperUser: {
    flexDirection: "row-reverse",
  },
  wrapperAgent: {
    flexDirection: "row",
  },
  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarUser: {
    background: "#2563eb",
    color: "#fff",
  },
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
  content: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  thinkingBubble: {
    background: "#ffffff",
    border: "1px solid #ebebeb",
    borderRadius: "16px",
    borderTopLeftRadius: "4px",
    padding: "12px 16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
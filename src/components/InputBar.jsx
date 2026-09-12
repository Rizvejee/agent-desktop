import { useState } from "react";
import { Send } from "lucide-react";

export default function InputBar({ onSendMessage, isThinking, disabled, attachments }) {
  const [input, setInput] = useState("");

  async function handleSend() {
    if (!input.trim() || isThinking || disabled) return;

    let fullMessage = input.trim();
    if (attachments && attachments.length > 0) {
      const attachmentContext = attachments
        .map((a) => `--- File: ${a.name} ---\n${a.content}`)
        .join("\n\n");
      fullMessage = `${fullMessage}\n\nAttached files:\n${attachmentContext}`;
    }

    onSendMessage(fullMessage, input.trim());
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Select a project to start..."
              : "Type your message or /help for commands..."
          }
          disabled={disabled}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...(isThinking || !input.trim() || disabled
              ? styles.sendBtnDisabled
              : {}),
          }}
          onClick={handleSend}
          disabled={isThinking || !input.trim() || disabled}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "12px 20px 16px",
    background: "#ffffff",
    borderTop: "1px solid #ebebeb",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    background: "#f8f8f8",
    border: "1px solid #ebebeb",
    borderRadius: "10px",
    color: "#1a1a1a",
    padding: "11px 14px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "none",
    minHeight: "42px",
    maxHeight: "120px",
    outline: "none",
    lineHeight: "1.5",
  },
  sendBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    height: "42px",
    width: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    background: "#e8e8e8",
    color: "#bbb",
    cursor: "not-allowed",
  },
};

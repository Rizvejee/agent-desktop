import { useState } from "react";
import { Send } from "lucide-react";
import { useTheme } from "../ThemeContext";

export default function InputBar({ onSendMessage, isThinking, disabled, attachments }) {
  const { theme } = useTheme();
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
    <div
      style={{
        ...styles.container,
        background: theme.bgCard,
        borderTop: `1px solid ${theme.border}`,
        boxShadow: `0 -1px 3px rgba(0,0,0,0.04)`,
      }}
    >
      {/* Attachments indicator */}
      {attachments && attachments.length > 0 && (
        <div style={styles.attachmentsIndicator}>
          {attachments.map((file) => (
            <span
              key={file.name}
              style={{
                ...styles.attachmentTag,
                background: theme.accentLight,
                color: theme.accentText,
                border: `1px solid ${theme.accent}22`,
              }}
            >
              {file.name}
            </span>
          ))}
        </div>
      )}

      <div style={styles.inputRow}>
        <textarea
          style={{
            ...styles.textarea,
            background: theme.bgInput,
            border: `1px solid ${theme.border}`,
            color: theme.textPrimary,
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Select a project to start..."
              : "Type your message... (Enter to send, Shift+Enter for new line)"
          }
          disabled={disabled}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            background:
              isThinking || !input.trim() || disabled
                ? theme.bgHover
                : theme.accent,
            color:
              isThinking || !input.trim() || disabled
                ? theme.textMuted
                : theme.textInverse,
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
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flexShrink: 0,
  },
  attachmentsIndicator: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  attachmentTag: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "500",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    borderRadius: "12px",
    padding: "11px 16px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "none",
    minHeight: "44px",
    maxHeight: "120px",
    outline: "none",
    lineHeight: "1.5",
    transition: "border-color 0.15s",
  },
  sendBtn: {
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    height: "44px",
    width: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s",
  },
};
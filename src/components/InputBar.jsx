import { useState, useRef } from "react";
import { Send, Square, Loader } from "lucide-react";
import { useTheme } from "../ThemeContext";

export default function InputBar({ onSendMessage, onStopMessage, isThinking, disabled, attachments }) {
  const { theme } = useTheme();
  const [input, setInput] = useState("");

  async function handleSend() {
    if (!input.trim() || isThinking || disabled) return;

    let fullMessage = input.trim();
    if (attachments && attachments.length > 0) {
      const ctx = attachments
        .filter((a) => a.type !== "image")
        .map((a) => `--- File: ${a.name} ---\n${a.content}`)
        .join("\n\n");
      if (ctx) fullMessage += `\n\nAttached files:\n${ctx}`;
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

  // Send button کا content
  function renderSendBtn() {
    if (isThinking) {
      return (
        <div style={styles.sendBtnInner}>
          <div style={styles.spinnerRing} />
          <Square size={10} style={styles.stopIcon} />
        </div>
      );
    }
    return <Send size={16} />;
  }

  return (
    <div
      style={{
        ...styles.container,
        background: theme.bgCard,
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      {/* Attachments indicator */}
      {attachments && attachments.length > 0 && (
        <div style={styles.attachmentsList}>
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
            direction: "auto",
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

        {/* Send / Stop button */}
        <button
          style={{
            ...styles.sendBtn,
            background: isThinking
              ? theme.bgCard
              : !input.trim() || disabled
              ? theme.bgHover
              : theme.accent,
            border: isThinking
              ? `2px solid ${theme.accent}`
              : "none",
            color: isThinking
              ? theme.accent
              : !input.trim() || disabled
              ? theme.textMuted
              : "#fff",
          }}
          onClick={isThinking ? onStopMessage : handleSend}
          disabled={!isThinking && (!input.trim() || disabled)}
          title={isThinking ? "Stop" : "Send"}
        >
          {renderSendBtn()}
        </button>
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

const styles = {
  container: {
    padding: "10px 16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flexShrink: 0,
  },
  attachmentsList: {
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
    fontFamily: "'Segoe UI', 'Noto Nastaliq Urdu', Arial, sans-serif",
    resize: "none",
    minHeight: "44px",
    maxHeight: "160px",
    outline: "none",
    lineHeight: "1.6",
  },
  sendBtn: {
    borderRadius: "12px",
    cursor: "pointer",
    height: "44px",
    width: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.2s",
    position: "relative",
  },
  sendBtnInner: {
    position: "relative",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerRing: {
    position: "absolute",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: "2px solid transparent",
    borderTopColor: "currentColor",
    animation: "spin 0.8s linear infinite",
  },
  stopIcon: {
    position: "absolute",
  },
};

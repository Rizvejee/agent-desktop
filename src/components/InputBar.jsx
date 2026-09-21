import { useState, useRef } from "react";
import { Send, Square, Loader } from "lucide-react";
import { useTheme } from "../ThemeContext";

export default function InputBar({ onSendMessage, onStopMessage, isThinking, disabled, attachments }) {
  const { theme } = useTheme();
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

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

    // ✅ Textarea کو reset کریں
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function autoResize(e) {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
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
        background: "transparent",
        borderTop: "none",
        padding: "8px 16px 14px",
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
          ref={textareaRef}
          style={{
            ...styles.textarea,
            background: theme.bgCard,
            border: `1px solid ${theme.border}`,
            color: theme.textPrimary,
            direction: "auto",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize(e);
          }}
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
            border: isThinking ? `2px solid ${theme.accent}` : "none",
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
        /* Scrollbar مکمل طور پر چھپائیں — تمام browsers میں */
        textarea::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        textarea {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
    </div>
  );
}

// ✅ FIX: Duplicate `textarea` key ہٹا دیا — اب صرف ایک definition ہے
const styles = {
  container: {
    padding: "8px 16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flexShrink: 0,
    background: "transparent",
  },
  textarea: {
    flex: 1,
    borderRadius: "12px",
    padding: "11px 16px",
    fontSize: "14px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    resize: "none",
    minHeight: "44px",
    maxHeight: "160px",
    outline: "none",
    lineHeight: "1.6",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    overflow: "hidden", // ✅ scrollbar چھپانے کے لیے
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.2s",
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

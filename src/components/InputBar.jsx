import { useState } from "react";
import { Paperclip, Send, X, FileText } from "lucide-react";

export default function InputBar({ onSendMessage, isThinking, disabled }) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);

  async function handleAttachment() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".js,.jsx,.ts,.tsx,.css,.html,.json,.md,.txt";
    fileInput.multiple = true;

    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        if (attachments.find((a) => a.name === file.name)) continue;
        const result = await window.electronAPI.readAttachment(file.path);
        if (result.success) {
          setAttachments((prev) => [
            ...prev,
            { name: file.name, path: file.path, content: result.content },
          ]);
        }
      }
    };

    fileInput.click();
  }

  function removeAttachment(name) {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  }

  async function handleSend() {
    if (!input.trim() || isThinking || disabled) return;

    let fullMessage = input.trim();
    if (attachments.length > 0) {
      const attachmentContext = attachments
        .map((a) => `--- File: ${a.name} ---\n${a.content}`)
        .join("\n\n");
      fullMessage = `${fullMessage}\n\nAttached files:\n${attachmentContext}`;
    }

    onSendMessage(fullMessage, input.trim());
    setInput("");
    setAttachments([]);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={styles.container}>
      {/* Attachments */}
      {attachments.length > 0 && (
        <div style={styles.attachmentsList}>
          {attachments.map((file) => (
            <div key={file.name} style={styles.attachmentItem}>
              <FileText size={12} color="#2563eb" />
              <span style={styles.attachmentName}>{file.name}</span>
              <button
                style={styles.removeBtn}
                onClick={() => removeAttachment(file.name)}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div style={styles.inputRow}>
        <button
          style={styles.attachBtn}
          onClick={handleAttachment}
          disabled={disabled}
          title="Attach files"
        >
          <Paperclip size={16} color="#888" />
        </button>

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
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  attachmentsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  attachmentItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "20px",
    fontSize: "12px",
    color: "#2563eb",
  },
  attachmentName: {
    maxWidth: "140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    padding: "0",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-end",
  },
  attachBtn: {
    background: "#f5f5f5",
    border: "1px solid #ebebeb",
    borderRadius: "10px",
    cursor: "pointer",
    height: "42px",
    width: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
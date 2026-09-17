import { useState } from "react";
import { useTheme } from "../ThemeContext";
import { Code, Eye, Copy, Check, ExternalLink } from "lucide-react";

export default function ArtifactPreview({ code, language }) {
  const { theme } = useTheme();
  const [view, setView] = useState("preview"); // "preview" or "code"
  const [copied, setCopied] = useState(false);

  // HTML/CSS/JS کو مکمل HTML document میں wrap کریں
  function wrapInHTML(code, lang) {
    if (lang === "html" || lang === "htm") {
      // اگر پہلے سے مکمل HTML ہے تو ویسے ہی رکھیں
      if (code.includes("<!DOCTYPE") || code.includes("<html")) {
        return code;
      }
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: sans-serif; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
    }
    if (lang === "css") {
      return `<!DOCTYPE html>
<html>
<head>
  <style>${code}</style>
</head>
<body>
  <div class="preview-container">
    <h1>CSS Preview</h1>
    <p>Add HTML elements to see your CSS in action.</p>
    <button>A Button</button>
    <input type="text" placeholder="Input field" />
  </div>
</body>
</html>`;
    }
    if (lang === "js" || lang === "javascript") {
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 16px; font-family: sans-serif; }
    #output { margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px; font-family: monospace; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>JavaScript Preview</h1>
  <div id="output"></div>
  <script>
    try {
      const result = (function() {
        ${code}
      })();
      if (result !== undefined) {
        document.getElementById('output').textContent = 'Result: ' + String(result);
      }
    } catch (err) {
      document.getElementById('output').textContent = 'Error: ' + err.message;
    }
  </script>
</body>
</html>`;
    }
    return code;
  }

  const htmlContent = wrapInHTML(code, language);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openInNewTab() {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  return (
    <div
      style={{
        borderRadius: "12px",
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
        margin: "12px 0",
        background: theme.bgCard,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: theme.bgHover,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: theme.accent,
            }}
          >
            Artifact
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "10px",
              background: theme.accentLight,
              color: theme.accent,
              fontWeight: "600",
            }}
          >
            {language?.toUpperCase() || "HTML"}
          </span>
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "none",
              background: view === "preview" ? theme.accent : "transparent",
              color: view === "preview" ? "#fff" : theme.textSecondary,
              fontSize: "11px",
              fontWeight: "500",
              cursor: "pointer",
            }}
            onClick={() => setView("preview")}
          >
            <Eye size={11} />
            Preview
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "none",
              background: view === "code" ? theme.accent : "transparent",
              color: view === "code" ? "#fff" : theme.textSecondary,
              fontSize: "11px",
              fontWeight: "500",
              cursor: "pointer",
            }}
            onClick={() => setView("code")}
          >
            <Code size={11} />
            Code
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: theme.textSecondary,
              fontSize: "11px",
              cursor: "pointer",
            }}
            onClick={copyCode}
            title="Copy code"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: theme.textSecondary,
              fontSize: "11px",
              cursor: "pointer",
            }}
            onClick={openInNewTab}
            title="Open in new tab"
          >
            <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "preview" ? (
        <iframe
          srcDoc={htmlContent}
          style={{
            width: "100%",
            height: "400px",
            border: "none",
            background: "#fff",
          }}
          sandbox="allow-scripts allow-same-origin"
          title="Artifact Preview"
        />
      ) : (
        <pre
          style={{
            margin: 0,
            padding: "16px",
            fontSize: "13px",
            lineHeight: "1.6",
            fontFamily: "Monaco, Menlo, monospace",
            color: theme.textPrimary,
            background: theme.bgInput,
            overflow: "auto",
            maxHeight: "400px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {code}
        </pre>
      )}
    </div>
  );
}

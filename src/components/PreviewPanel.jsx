import { useState, useEffect, useRef } from "react";
import { useTheme } from "../ThemeContext";
import {
  Eye,
  RefreshCw,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  X,
  Loader,
  AlertCircle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// PORT DETECTION (package.json سے)
// ✅ readFile استعمال کریں (readFileContent نہیں)
// ═══════════════════════════════════════════════════════
async function detectPort(project) {
  if (!project) return 3000;

  try {
    const packageJsonPath = `${project.path}/package.json`;

    // ✅ readFile استعمال کریں — پوری path کے ساتھ
    const response = await window.electronAPI.readFile(packageJsonPath);

    if (!response.success) {
      return getDefaultPort(project.name);
    }

    const packageJson = JSON.parse(response.content);
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const scripts = packageJson.scripts || {};
    const devScript = scripts.dev || "";

    // Port explicitly mentioned ہے؟
    const portMatch = devScript.match(/--port\s+(\d+)/) ||
                     devScript.match(/-p\s+(\d+)/);
    if (portMatch) return parseInt(portMatch[1]);

    // Framework سے اندازہ
    if (deps["next"]) return 3000;
    if (deps["vite"] || deps["@vitejs/plugin-react"]) return 5173;
    if (deps["expo"]) return 8081;
    if (deps["@angular/cli"]) return 4200;
    if (deps["vue"] || deps["@vue/cli-service"]) return 5173;
    if (deps["create-react-app"] || deps["react-scripts"]) return 3000;

    return 3000;
  } catch (error) {
    console.error("Error detecting port:", error);
    return getDefaultPort(project.name);
  }
}

function getDefaultPort(name) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("next")) return 3000;
  if (lower.includes("vite") || lower.includes("react")) return 5173;
  if (lower.includes("expo")) return 8081;
  return 3000;
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function PreviewPanel({ activeProject, onClose }) {
  const { theme } = useTheme();
  const [url, setUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [device, setDevice] = useState("desktop");
  const iframeRef = useRef(null);
  const timeoutRef = useRef(null); // ✅ نیا: timeout tracking کے لیے

  // جب project بدلے تو preview setup کریں
  useEffect(() => {
    async function setupPreview() {
      if (activeProject) {
        setIsLoading(true);
        setHasError(false);
        const port = await detectPort(activeProject);
        const defaultUrl = `http://localhost:${port}`;
        setUrl(defaultUrl);
        setCustomUrl(defaultUrl);
      }
    }
    setupPreview();
  }, [activeProject?.id]);

  // ✅ نیا: Timeout-based error detection
  useEffect(() => {
    if (!url) return;

    // پرانا timeout clear کریں
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);
    setHasError(false);

    // 15 seconds بعد اگر load نہ ہو تو error
    timeoutRef.current = setTimeout(() => {
      setHasError(true);
      setIsLoading(false);
    }, 15000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [url]);

  function handleRefresh() {
    setIsLoading(true);
    setHasError(false);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  }

  function handleUrlSubmit(e) {
    e.preventDefault();
    if (customUrl.trim()) {
      setUrl(customUrl.trim());
      setIsLoading(true);
      setHasError(false);
    }
  }

  // ✅ نیا: Load ہونے پر timeout clear کریں
  function handleIframeLoad() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
    setHasError(false);
  }

  function openExternal() {
    window.electronAPI?.openExternal?.(url);
    window.open(url, "_blank");
  }

  const deviceWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  return (
    <div style={{ ...styles.container, background: theme.bgMain }}>
      {/* Header */}
      <div
        style={{
          ...styles.header,
          background: theme.bgCard,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Eye size={15} color={theme.accent} />
          <span style={{ ...styles.headerTitle, color: theme.textPrimary }}>
            Live Preview
          </span>
          {activeProject && (
            <span style={{ ...styles.badge, color: theme.textMuted }}>
              {activeProject.name}
            </span>
          )}
        </div>

        {/* Device Toggle */}
        <div style={styles.deviceToggle}>
          {[
            { id: "desktop", icon: Monitor, label: "Desktop" },
            { id: "tablet", icon: Tablet, label: "Tablet" },
            { id: "mobile", icon: Smartphone, label: "Mobile" },
          ].map((d) => {
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                style={{
                  ...styles.deviceBtn,
                  background: device === d.id ? theme.accentLight : "transparent",
                  color: device === d.id ? theme.accent : theme.textMuted,
                }}
                onClick={() => setDevice(d.id)}
                title={d.label}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            style={{ ...styles.actionBtn, color: theme.textMuted }}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <button
            style={{ ...styles.actionBtn, color: theme.textMuted }}
            onClick={openExternal}
            title="Open in browser"
          >
            <ExternalLink size={13} />
          </button>
          <button
            style={{ ...styles.actionBtn, color: theme.textMuted }}
            onClick={onClose}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* URL Bar */}
      <form
        onSubmit={handleUrlSubmit}
        style={{
          ...styles.urlBar,
          background: theme.bgCard,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <input
          style={{
            ...styles.urlInput,
            background: theme.bgInput,
            border: `1px solid ${theme.border}`,
            color: theme.textPrimary,
          }}
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="http://localhost:3000"
        />
        <button
          type="submit"
          style={{
            ...styles.goBtn,
            background: theme.accent,
            color: "#fff",
          }}
        >
          Go
        </button>
      </form>

      {/* Preview Area */}
      <div style={{ ...styles.previewArea, background: theme.bgInput }}>
        <div
          style={{
            ...styles.iframeWrapper,
            maxWidth: deviceWidths[device],
          }}
        >
          {isLoading && !hasError && (
            <div style={styles.loadingOverlay}>
              <Loader
                size={24}
                color={theme.accent}
                style={{ animation: "spin 1s linear infinite" }}
              />
              <span style={{ color: theme.textMuted, fontSize: "13px" }}>
                Loading preview...
              </span>
              <span style={{ color: theme.textMuted, fontSize: "11px" }}>
                Make sure your dev server is running
              </span>
            </div>
          )}

          {hasError && (
            <div style={styles.errorOverlay}>
              <AlertCircle size={32} color={theme.error} />
              <span style={{ color: theme.error, fontSize: "14px" }}>
                Preview not available
              </span>
              <span style={{ color: theme.textMuted, fontSize: "12px" }}>
                Make sure your dev server is running at {url}
              </span>
              <button
                style={{
                  ...styles.retryBtn,
                  background: theme.accent,
                  color: "#fff",
                }}
                onClick={handleRefresh}
              >
                Retry
              </button>
            </div>
          )}

          {/* ✅ iframe — allow-same-origin رکھا گیا ہے */}
          <iframe
            ref={iframeRef}
            src={url}
            style={styles.iframe}
            onLoad={handleIframeLoad}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            title="Project Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
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

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "14px",
    fontWeight: "600",
  },
  badge: {
    fontSize: "11px",
    fontFamily: "Monaco, Menlo, monospace",
  },
  deviceToggle: {
    display: "flex",
    gap: "2px",
    background: "transparent",
    borderRadius: "6px",
    padding: "2px",
  },
  deviceBtn: {
    border: "none",
    borderRadius: "5px",
    padding: "5px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "6px",
    borderRadius: "6px",
  },
  urlBar: {
    padding: "8px 16px",
    display: "flex",
    gap: "6px",
    flexShrink: 0,
  },
  urlInput: {
    flex: 1,
    padding: "7px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontFamily: "Monaco, Menlo, monospace",
    outline: "none",
  },
  goBtn: {
    border: "none",
    borderRadius: "6px",
    padding: "7px 14px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  previewArea: {
    flex: 1,
    overflow: "auto",
    display: "flex",
    justifyContent: "center",
    padding: "16px",
  },
  iframeWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    background: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    background: "rgba(255,255,255,0.9)",
    zIndex: 10,
  },
  errorOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.95)",
    zIndex: 10,
  },
  retryBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "8px 20px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
  },
};

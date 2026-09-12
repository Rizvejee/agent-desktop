import { useState, useEffect } from "react";
import {
  X,
  Key,
  Bot,
  Moon,
  Sun,
  Check,
  ChevronRight,
} from "lucide-react";

const MODELS = [
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", desc: "Most capable" },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B", desc: "Faster" },
  { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", desc: "Alternative" },
];

const AGENT_MODES = [
  { id: "ask", label: "Ask", desc: "Only suggest code, never modify files" },
  { id: "assisted", label: "Assisted", desc: "Ask before making changes" },
  { id: "auto", label: "Auto", desc: "Work independently" },
];

export default function Settings({ onClose }) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [agentMode, setAgentMode] = useState("assisted");
  const [theme, setTheme] = useState("light");
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("model");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const result = await window.electronAPI.getSettings();
    if (result.success) {
      const s = result.settings;
      if (s.apiKey) setApiKey(s.apiKey);
      if (s.model) setSelectedModel(s.model);
      if (s.agentMode) setAgentMode(s.agentMode);
      if (s.theme) setTheme(s.theme);
    }
  }

  async function saveSettings() {
    await window.electronAPI.saveSettings({
      apiKey,
      model: selectedModel,
      agentMode,
      theme,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Settings</span>
        <button style={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div style={styles.body}>
        {/* Left Nav */}
        <div style={styles.nav}>
          {[
            { id: "model", label: "AI Model", icon: <Bot size={15} /> },
            { id: "api", label: "API Keys", icon: <Key size={15} /> },
            { id: "agent", label: "Agent Mode", icon: <ChevronRight size={15} /> },
            { id: "appearance", label: "Appearance", icon: <Sun size={15} /> },
          ].map((item) => (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(activeSection === item.id ? styles.navItemActive : {}),
              }}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div style={styles.content}>

          {/* AI Model */}
          {activeSection === "model" && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>AI Model</h3>
              <p style={styles.sectionDesc}>
                Choose which model powers your coding agent.
              </p>
              <div style={styles.modelList}>
                {MODELS.map((model) => (
                  <div
                    key={model.id}
                    style={{
                      ...styles.modelItem,
                      ...(selectedModel === model.id
                        ? styles.modelItemActive
                        : {}),
                    }}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div style={styles.modelInfo}>
                      <span style={styles.modelName}>{model.name}</span>
                      <span style={styles.modelDesc}>{model.desc}</span>
                    </div>
                    {selectedModel === model.id && (
                      <Check size={16} color="#2563eb" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeSection === "api" && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>API Configuration</h3>
              <p style={styles.sectionDesc}>
                Your Groq API key for AI model access.
              </p>
              <div style={styles.field}>
                <label style={styles.label}>Groq API Key</label>
                <div style={styles.inputRow}>
                  <input
                    style={styles.input}
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                  />
                  <button
                    style={styles.toggleBtn}
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <span style={styles.fieldHint}>
                  Get your API key from console.groq.com
                </span>
              </div>
            </div>
          )}

          {/* Agent Mode */}
          {activeSection === "agent" && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Agent Mode</h3>
              <p style={styles.sectionDesc}>
                Control how much autonomy the agent has.
              </p>
              <div style={styles.modeList}>
                {AGENT_MODES.map((mode) => (
                  <div
                    key={mode.id}
                    style={{
                      ...styles.modeItem,
                      ...(agentMode === mode.id ? styles.modeItemActive : {}),
                    }}
                    onClick={() => setAgentMode(mode.id)}
                  >
                    <div style={styles.modeRadio}>
                      {agentMode === mode.id && (
                        <div style={styles.modeRadioInner} />
                      )}
                    </div>
                    <div style={styles.modeInfo}>
                      <span style={styles.modeLabel}>{mode.label}</span>
                      <span style={styles.modeDesc}>{mode.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === "appearance" && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Appearance</h3>
              <p style={styles.sectionDesc}>
                Customize how the app looks.
              </p>
              <div style={styles.field}>
                <label style={styles.label}>Theme</label>
                <div style={styles.themeRow}>
                  <button
                    style={{
                      ...styles.themeBtn,
                      ...(theme === "light" ? styles.themeBtnActive : {}),
                    }}
                    onClick={() => setTheme("light")}
                  >
                    <Sun size={16} />
                    Light
                  </button>
                  <button
                    style={{
                      ...styles.themeBtn,
                      ...(theme === "dark" ? styles.themeBtnActive : {}),
                    }}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon size={16} />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div style={styles.saveRow}>
            <button style={styles.saveBtn} onClick={saveSettings}>
              {saved ? (
                <><Check size={14} /> Saved!</>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#f5f5f5",
    overflow: "hidden",
  },
  header: {
    padding: "16px 24px",
    background: "#ffffff",
    borderBottom: "1px solid #ebebeb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#bbb",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    borderRadius: "6px",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  nav: {
    width: "180px",
    background: "#ffffff",
    borderRight: "1px solid #ebebeb",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flexShrink: 0,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 12px",
    background: "none",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#666",
    textAlign: "left",
    fontWeight: "500",
  },
  navItemActive: {
    background: "#eff6ff",
    color: "#2563eb",
  },
  content: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: 0,
  },
  sectionDesc: {
    fontSize: "13px",
    color: "#888",
    margin: 0,
  },
  modelList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  modelItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    background: "#ffffff",
    border: "1px solid #ebebeb",
    borderRadius: "10px",
    cursor: "pointer",
  },
  modelItemActive: {
    border: "1.5px solid #2563eb",
    background: "#eff6ff",
  },
  modelInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  modelName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  modelDesc: {
    fontSize: "12px",
    color: "#888",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#444",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    border: "1px solid #ebebeb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    color: "#1a1a1a",
    background: "#ffffff",
    fontFamily: "Monaco, Menlo, monospace",
  },
  toggleBtn: {
    padding: "10px 16px",
    background: "#f5f5f5",
    border: "1px solid #ebebeb",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#666",
    flexShrink: 0,
  },
  fieldHint: {
    fontSize: "11px",
    color: "#bbb",
  },
  modeList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  modeItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    background: "#ffffff",
    border: "1px solid #ebebeb",
    borderRadius: "10px",
    cursor: "pointer",
  },
  modeItemActive: {
    border: "1.5px solid #2563eb",
    background: "#eff6ff",
  },
  modeRadio: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: "2px solid #d0d0d0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modeRadioInner: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#2563eb",
  },
  modeInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  modeLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  modeDesc: {
    fontSize: "12px",
    color: "#888",
  },
  themeRow: {
    display: "flex",
    gap: "8px",
  },
  themeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "#ffffff",
    border: "1px solid #ebebeb",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#666",
    fontWeight: "500",
  },
  themeBtnActive: {
    border: "1.5px solid #2563eb",
    background: "#eff6ff",
    color: "#2563eb",
  },
  saveRow: {
    marginTop: "auto",
    paddingTop: "20px",
    display: "flex",
    justifyContent: "flex-end",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 24px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

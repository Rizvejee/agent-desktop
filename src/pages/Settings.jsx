import { useState, useEffect } from "react";
import {
  X,
  Key,
  Bot,
  Moon,
  Sun,
  Check,
  Sliders,
} from "lucide-react";
import { useTheme } from "../ThemeContext";

const MODELS = [
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", desc: "Most capable — recommended" },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B", desc: "Faster responses" },
  { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", desc: "Alternative model" },
];

const AGENT_MODES = [
  { id: "ask", label: "Ask", desc: "Only suggest code, never modify files" },
  { id: "assisted", label: "Assisted", desc: "Ask before making important changes" },
  { id: "auto", label: "Auto", desc: "Work independently without confirmation" },
];

const NAV_ITEMS = [
  { id: "model", label: "AI Model", icon: Bot },
  { id: "api", label: "API Keys", icon: Key },
  { id: "agent", label: "Agent Mode", icon: Sliders },
  { id: "appearance", label: "Appearance", icon: Sun },
];

export default function Settings({ onClose, onThemeChange, currentTheme }) {
  const { theme } = useTheme();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [agentMode, setAgentMode] = useState("assisted");
  const [activeSection, setActiveSection] = useState("model");
  const [saved, setSaved] = useState(false);

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
    }
  }

  async function saveSettings() {
    await window.electronAPI.saveSettings({
      apiKey,
      model: selectedModel,
      agentMode,
      theme: currentTheme,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  }

  return (
    <div
      style={{
        ...styles.container,
        background: theme.bgMain,
      }}
    >
      {/* Header */}
      <div
        style={{
          ...styles.header,
          background: theme.bgCard,
          borderBottom: `1px solid ${theme.border}`,
          boxShadow: theme.shadow,
        }}
      >
        <span style={{ ...styles.headerTitle, color: theme.textPrimary }}>
          Settings
        </span>
        <button
          style={{ ...styles.closeBtn, color: theme.textMuted }}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div style={styles.body}>
        {/* Left Nav */}
        <div
          style={{
            ...styles.nav,
            background: theme.bgCard,
            borderRight: `1px solid ${theme.border}`,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                style={{
                  ...styles.navItem,
                  background: isActive ? theme.bgActive : "transparent",
                  color: isActive ? theme.accent : theme.textSecondary,
                }}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right Content */}
        <div style={styles.content}>

          {/* AI Model */}
          {activeSection === "model" && (
            <div style={styles.section}>
              <h3 style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                AI Model
              </h3>
              <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
                Choose which model powers your coding agent.
              </p>
              <div style={styles.cardList}>
                {MODELS.map((model) => {
                  const isSelected = selectedModel === model.id;
                  return (
                    <div
                      key={model.id}
                      style={{
                        ...styles.card,
                        background: theme.bgCard,
                        border: isSelected
                          ? `2px solid ${theme.accent}`
                          : `1px solid ${theme.border}`,
                        boxShadow: isSelected ? `0 0 0 3px ${theme.accent}18` : theme.shadow,
                      }}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      <div style={styles.cardInfo}>
                        <span style={{ ...styles.cardTitle, color: theme.textPrimary }}>
                          {model.name}
                        </span>
                        <span style={{ ...styles.cardDesc, color: theme.textMuted }}>
                          {model.desc}
                        </span>
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            ...styles.checkCircle,
                            background: theme.accent,
                          }}
                        >
                          <Check size={12} color="#fff" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeSection === "api" && (
            <div style={styles.section}>
              <h3 style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                API Configuration
              </h3>
              <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
                Your Groq API key for AI model access.
              </p>
              <div style={styles.field}>
                <label style={{ ...styles.label, color: theme.textSecondary }}>
                  Groq API Key
                </label>
                <div style={styles.inputRow}>
                  <input
                    style={{
                      ...styles.input,
                      background: theme.bgInput,
                      border: `1px solid ${theme.border}`,
                      color: theme.textPrimary,
                    }}
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                  />
                  <button
                    style={{
                      ...styles.toggleBtn,
                      background: theme.bgHover,
                      border: `1px solid ${theme.border}`,
                      color: theme.textSecondary,
                    }}
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <span style={{ ...styles.fieldHint, color: theme.textMuted }}>
                  Get your free API key from console.groq.com
                </span>
              </div>
            </div>
          )}

          {/* Agent Mode */}
          {activeSection === "agent" && (
            <div style={styles.section}>
              <h3 style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                Agent Mode
              </h3>
              <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
                Control how much autonomy the agent has.
              </p>
              <div style={styles.cardList}>
                {AGENT_MODES.map((mode) => {
                  const isSelected = agentMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      style={{
                        ...styles.card,
                        background: theme.bgCard,
                        border: isSelected
                          ? `2px solid ${theme.accent}`
                          : `1px solid ${theme.border}`,
                        boxShadow: isSelected
                          ? `0 0 0 3px ${theme.accent}18`
                          : theme.shadow,
                      }}
                      onClick={() => setAgentMode(mode.id)}
                    >
                      <div
                        style={{
                          ...styles.radio,
                          border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                        }}
                      >
                        {isSelected && (
                          <div
                            style={{
                              ...styles.radioInner,
                              background: theme.accent,
                            }}
                          />
                        )}
                      </div>
                      <div style={styles.cardInfo}>
                        <span
                          style={{
                            ...styles.cardTitle,
                            color: theme.textPrimary,
                          }}
                        >
                          {mode.label}
                        </span>
                        <span
                          style={{
                            ...styles.cardDesc,
                            color: theme.textMuted,
                          }}
                        >
                          {mode.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === "appearance" && (
            <div style={styles.section}>
              <h3 style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
                Appearance
              </h3>
              <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
                Customize how the app looks.
              </p>
              <div style={styles.field}>
                <label style={{ ...styles.label, color: theme.textSecondary }}>
                  Theme
                </label>
                <div style={styles.themeRow}>
                  {[
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = currentTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        style={{
                          ...styles.themeBtn,
                          background: isSelected
                            ? theme.accentLight
                            : theme.bgCard,
                          border: isSelected
                            ? `2px solid ${theme.accent}`
                            : `1px solid ${theme.border}`,
                          color: isSelected
                            ? theme.accent
                            : theme.textSecondary,
                        }}
                        onClick={() => onThemeChange(t.id)}
                      >
                        <Icon size={16} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div style={styles.saveRow}>
            <button
              style={{
                ...styles.saveBtn,
                background: saved ? theme.success : theme.accent,
                color: theme.textInverse,
              }}
              onClick={saveSettings}
            >
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
    overflow: "hidden",
  },
  header: {
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "600",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
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
    fontWeight: "500",
    textAlign: "left",
  },
  content: {
    flex: 1,
    padding: "28px",
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
    fontSize: "18px",
    fontWeight: "700",
    margin: 0,
  },
  sectionDesc: {
    fontSize: "13px",
    margin: 0,
    lineHeight: "1.5",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.15s",
    gap: "12px",
  },
  cardInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: "600",
  },
  cardDesc: {
    fontSize: "12px",
  },
  checkCircle: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radio: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioInner: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "Monaco, Menlo, monospace",
  },
  toggleBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    flexShrink: 0,
  },
  fieldHint: {
    fontSize: "11px",
  },
  themeRow: {
    display: "flex",
    gap: "10px",
  },
  themeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "500",
  },
  saveRow: {
    marginTop: "auto",
    paddingTop: "24px",
    display: "flex",
    justifyContent: "flex-end",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 28px",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
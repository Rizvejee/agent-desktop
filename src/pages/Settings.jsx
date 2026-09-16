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
  { id: "agent-config", label: "Agent", icon: Bot },
  { id: "model", label: "AI Model", icon: Bot },
  { id: "agentmode", label: "Agent Mode", icon: Sliders },
  { id: "appearance", label: "Appearance", icon: Sun },
];


export default function Settings({ onClose, onThemeChange, currentTheme }) {
  const [provider, setProvider] = useState("groq");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqModel, setGroqModel] = useState("openai/gpt-oss-120b");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434/v1");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const { theme } = useTheme();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [agentMode, setAgentMode] = useState("assisted");
  const [activeSection, setActiveSection] = useState("model");
  const [saved, setSaved] = useState(false);
  const [agentName, setAgentName] = useState("Coder");
  const [agentRole, setAgentRole] = useState("Personal AI Coding Assistant");
  const [agentLanguage, setAgentLanguage] = useState("English");
  const [agentRules, setAgentRules] = useState(
  "Always write clean, readable and reusable code.\nFollow DRY principles and existing project architecture.\nDo not add unnecessary dependencies.\nKeep explanations concise."
   );
  const [agentTechnologies, setAgentTechnologies] = useState([
  "React",
  "React Native",
  "Next.js",
  "Expo",
  "JavaScript",
  "HTML",
  "CSS",
]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const result = await window.electronAPI.getSettings();
    if (result.success) {
      const s = result.settings;
      if (s.provider) setProvider(s.provider);
      if (s.groqApiKey) setGroqApiKey(s.groqApiKey);
      if (s.groqModel) setGroqModel(s.groqModel);
      if (s.geminiApiKey) setGeminiApiKey(s.geminiApiKey);
      if (s.geminiModel) setGeminiModel(s.geminiModel);
      if (s.ollamaUrl) setOllamaUrl(s.ollamaUrl);
      if (s.ollamaModel) setOllamaModel(s.ollamaModel);
      if (s.agentMode) setAgentMode(s.agentMode);
      if (s.agentSettings) {
        if (s.agentSettings.name) setAgentName(s.agentSettings.name);
        if (s.agentSettings.role) setAgentRole(s.agentSettings.role);
        if (s.agentSettings.language) setAgentLanguage(s.agentSettings.language);
        if (s.agentSettings.rules) setAgentRules(s.agentSettings.rules);
        if (s.agentSettings.technologies) setAgentTechnologies(s.agentSettings.technologies);
      }
    }
  }

  async function saveSettings() {
    await window.electronAPI.saveSettings({
      provider,
      groqApiKey,
      groqModel,
      geminiApiKey,
      geminiModel,
      ollamaUrl,
      ollamaModel,
      agentMode,
      theme: currentTheme,
      agentSettings: {
        name: agentName,
        role: agentRole,
        language: agentLanguage,
        rules: agentRules,
        technologies: agentTechnologies,
      },
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  }

  const providerStyles = {
    box: {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      padding: "16px",
      borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      marginTop: "4px",
    },
    title: {
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    notice: {
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "12px",
      lineHeight: "1.6",
    },
  };

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

        {activeSection === "agent-config" && (
  <div style={styles.section}>
    <h3 style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
      Agent Configuration
    </h3>
    <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
      Customize your agent's identity, language and behavior.
    </p>

    {/* Name */}
    <div style={styles.field}>
      <label style={{ ...styles.label, color: theme.textSecondary }}>
        Agent Name
      </label>
      <input
        style={{
          ...styles.input,
          background: theme.bgInput,
          border: `1px solid ${theme.border}`,
          color: theme.textPrimary,
        }}
        value={agentName}
        onChange={(e) => setAgentName(e.target.value)}
        placeholder="Coder"
      />
    </div>

    {/* Role */}
    <div style={styles.field}>
      <label style={{ ...styles.label, color: theme.textSecondary }}>
        Agent Role
      </label>
      <input
        style={{
          ...styles.input,
          background: theme.bgInput,
          border: `1px solid ${theme.border}`,
          color: theme.textPrimary,
        }}
        value={agentRole}
        onChange={(e) => setAgentRole(e.target.value)}
        placeholder="Personal AI Coding Assistant"
      />
    </div>

    {/* Language */}
    <div style={styles.field}>
      <label style={{ ...styles.label, color: theme.textSecondary }}>
        Language
      </label>
      <select
        style={{
          ...styles.input,
          background: theme.bgInput,
          border: `1px solid ${theme.border}`,
          color: theme.textPrimary,
          cursor: "pointer",
        }}
        value={agentLanguage}
        onChange={(e) => setAgentLanguage(e.target.value)}
      >
        <option value="English">English</option>
        <option value="Urdu">Urdu</option>
        <option value="Roman Urdu">Roman Urdu</option>
        <option value="Hindi">Hindi</option>
      </select>
    </div>

    {/* Technologies */}
    <div style={styles.field}>
      <label style={{ ...styles.label, color: theme.textSecondary }}>
        Technologies
      </label>
      <div style={styles.techGrid}>
        {[
          "React",
          "React Native",
          "Next.js",
          "Expo",
          "JavaScript",
          "Electron Plus React",
          "HTML",
          "CSS",
          "Node.js",
          "Express",
        ].map((tech) => {
          const isSelected = agentTechnologies.includes(tech);
          return (
            <button
              key={tech}
              style={{
                ...styles.techBtn,
                background: isSelected ? theme.accentLight : theme.bgCard,
                border: isSelected
                  ? `1.5px solid ${theme.accent}`
                  : `1px solid ${theme.border}`,
                color: isSelected ? theme.accent : theme.textSecondary,
              }}
              onClick={() => {
                if (isSelected) {
                  setAgentTechnologies((prev) =>
                    prev.filter((t) => t !== tech)
                  );
                } else {
                  setAgentTechnologies((prev) => [...prev, tech]);
                }
              }}
            >
              {isSelected && <Check size={11} />}
              {tech}
            </button>
          );
        })}
      </div>
    </div>

    {/* Rules */}
    <div style={styles.field}>
      <label style={{ ...styles.label, color: theme.textSecondary }}>
        Rules & Behavior
      </label>
      <textarea
        style={{
          ...styles.input,
          background: theme.bgInput,
          border: `1px solid ${theme.border}`,
          color: theme.textPrimary,
          height: "120px",
          resize: "vertical",
          fontFamily: "inherit",
          lineHeight: "1.6",
          padding: "10px 14px",
        }}
        value={agentRules}
        onChange={(e) => setAgentRules(e.target.value)}
        placeholder="- Always write clean code&#10;- Follow existing architecture&#10;- No unnecessary dependencies"
      />
      <span style={{ ...styles.fieldHint, color: theme.textMuted }}>
        Each rule on a new line. These apply to all projects.
      </span>
    </div>
  </div>
)}

          {/* AI Model */}
          {activeSection === "model" && (
  <div style={styles.section}>
    <h3 style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
      AI Model
    </h3>
    <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
      Choose your AI provider and configure its settings.
    </p>

    {/* Provider Selection */}
    <div style={styles.cardList}>
      {[
        {
          id: "groq",
          name: "Groq",
          desc: "Fast cloud AI — free tier available",
          badge: "Recommended",
        },
        {
          id: "gemini",
          name: "Google Gemini",
          desc: "Google's AI — free tier available",
          badge: "Free",
        },
        {
          id: "ollama",
          name: "Ollama (Local)",
          desc: "Run AI locally on your machine",
          badge: "Private",
        },
      ].map((p) => {
        const isSelected = provider === p.id;
        return (
          <div
            key={p.id}
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
            onClick={() => setProvider(p.id)}
          >
            <div style={styles.cardInfo}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ ...styles.cardTitle, color: theme.textPrimary }}>
                  {p.name}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background: theme.accentLight,
                    color: theme.accent,
                    fontWeight: "600",
                  }}
                >
                  {p.badge}
                </span>
              </div>
              <span style={{ ...styles.cardDesc, color: theme.textMuted }}>
                {p.desc}
              </span>
            </div>
            {isSelected && (
              <div style={{ ...styles.checkCircle, background: theme.accent }}>
                <Check size={12} color="#fff" />
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Groq Settings */}
    {provider === "groq" && (
      <div style={providerStyles.box}>
        <div style={{ ...providerStyles.title, color: theme.textSecondary }}>
          Groq Configuration
        </div>

        <div style={styles.field}>
          <label style={{ ...styles.label, color: theme.textSecondary }}>
            API Key
          </label>
          <div style={styles.inputRow}>
            <input
              style={{
                ...styles.input,
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
              }}
              type={showGroqKey ? "text" : "password"}
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="gsk_..."
            />
            <button
              style={{
                ...styles.toggleBtn,
                background: theme.bgHover,
                border: `1px solid ${theme.border}`,
                color: theme.textSecondary,
              }}
              onClick={() => setShowGroqKey(!showGroqKey)}
            >
              {showGroqKey ? "Hide" : "Show"}
            </button>
          </div>
          <span style={{ ...styles.fieldHint, color: theme.textMuted }}>
            Get free API key from console.groq.com
          </span>
        </div>

        <div style={styles.field}>
          <label style={{ ...styles.label, color: theme.textSecondary }}>
            Model
          </label>
          <select
            style={{
              ...styles.input,
              background: theme.bgInput,
              border: `1px solid ${theme.border}`,
              color: theme.textPrimary,
              cursor: "pointer",
            }}
            value={groqModel}
            onChange={(e) => setGroqModel(e.target.value)}
          >
            <option value="openai/gpt-oss-120b">GPT OSS 120B — Most capable</option>
            <option value="openai/gpt-oss-20b">GPT OSS 20B — Faster</option>
            <option value="qwen/qwen3.8-27b">Qwen 3.8 27B — Alternative</option>
          </select>
        </div>
      </div>
    )}

    {/* Gemini Settings */}
    {provider === "gemini" && (
      <div style={providerStyles.box}>
        <div style={{ ...providerStyles.title, color: theme.textSecondary }}>
          Google Gemini Configuration
        </div>

        <div style={styles.field}>
          <label style={{ ...styles.label, color: theme.textSecondary }}>
            API Key
          </label>
          <div style={styles.inputRow}>
            <input
              style={{
                ...styles.input,
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
              }}
              type={showGeminiKey ? "text" : "password"}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIza..."
            />
            <button
              style={{
                ...styles.toggleBtn,
                background: theme.bgHover,
                border: `1px solid ${theme.border}`,
                color: theme.textSecondary,
              }}
              onClick={() => setShowGeminiKey(!showGeminiKey)}
            >
              {showGeminiKey ? "Hide" : "Show"}
            </button>
          </div>
          <span style={{ ...styles.fieldHint, color: theme.textMuted }}>
            Get free API key from aistudio.google.com
          </span>
        </div>

        <div style={styles.field}>
          <label style={{ ...styles.label, color: theme.textSecondary }}>
            Model
          </label>
          <select
            style={{
              ...styles.input,
              background: theme.bgInput,
              border: `1px solid ${theme.border}`,
              color: theme.textPrimary,
              cursor: "pointer",
            }}
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value)}
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash — Fast</option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite — Fastest</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro — Most capable</option>
          </select>
        </div>
      </div>
    )}

    {/* Ollama Settings */}
    {provider === "ollama" && (
      <div style={providerStyles.box}>
        <div style={{ ...providerStyles.title, color: theme.textSecondary }}>
          Ollama Configuration
        </div>

        <div
          style={{
            ...providerStyles.notice,
            background: theme.accentLight,
            border: `1px solid ${theme.accent}33`,
            color: theme.textSecondary,
          }}
        >
          Ollama must be running on your machine. Install from ollama.com and run a model before connecting.
        </div>

        <div style={styles.field}>
          <label style={{ ...styles.label, color: theme.textSecondary }}>
            Server URL
          </label>
          <input
            style={{
              ...styles.input,
              background: theme.bgInput,
              border: `1px solid ${theme.border}`,
              color: theme.textPrimary,
              fontFamily: "Monaco, Menlo, monospace",
            }}
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434/v1"
          />
        </div>

        <div style={styles.field}>
          <label style={{ ...styles.label, color: theme.textSecondary }}>
            Model Name
          </label>
          <input
            style={{
              ...styles.input,
              background: theme.bgInput,
              border: `1px solid ${theme.border}`,
              color: theme.textPrimary,
              fontFamily: "Monaco, Menlo, monospace",
            }}
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
            placeholder="llama3.2"
          />
          <span style={{ ...styles.fieldHint, color: theme.textMuted }}>
            Run: ollama pull llama3.2
          </span>
        </div>
      </div>
    )}
  </div>
)}

          {/* API Keys */}
          {activeSection === "api" && (
          <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, color: theme.textPrimary }}>
           API Keys
          </h3>
          <p style={{ ...styles.sectionDesc, color: theme.textMuted }}>
          API keys are now configured in the AI Model section. Select your provider there to enter your API key.
          </p>
      <button
      style={{
        ...styles.saveBtn,
        background: theme.accent,
        color: "#fff",
        alignSelf: "flex-start",
        marginTop: "8px",
        border: "none",
        padding: "10px 20px",
        cursor: "pointer",
      }}
      onClick={() => setActiveSection("model")}
    >
      Go to AI Model
    </button>
  </div>
)}

          {/* Agent Mode */}
          {activeSection === "agentmode" && (
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
  techGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  techBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s",
  },
};

import { useState, useEffect } from "react";
import { Bot, Moon, Sun } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import Settings from "./pages/Settings";
import { useProjects } from "./hooks/useProjects";
import { useChats } from "./hooks/useChats";
import { useTheme } from "./ThemeContext";

export default function App() {
  const { theme, mode, toggleTheme } = useTheme();

  const {
    projects,
    activeProject,
    addProject,
    removeProject,
    switchProject,
  } = useProjects();

  const {
    chats,
    activeChat,
    setActiveChat,
    newChat,
    deleteChat,
    updateChat,
  } = useChats(activeProject);

  const [isThinking, setIsThinking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toolStatuses, setToolStatuses] = useState([]);

  useEffect(() => {
    window.electronAPI.onToolStatus((data) => {
      setToolStatuses((prev) => {
        const existing = prev.findIndex(
          (t) =>
            t.tool === data.tool &&
            JSON.stringify(t.input) === JSON.stringify(data.input)
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    return () => {
      window.electronAPI.removeToolStatusListener();
    };
  }, []);

  async function handleSendMessage(fullMessage, displayMessage) {
    if (!activeChat || !activeProject) return;

    setToolStatuses([]);

    const instrResult = await window.electronAPI.getInstructions(
      activeProject.id
    );
    const instructions = instrResult.success ? instrResult.instructions : "";

    const updatedChat = {
      ...activeChat,
      messages: [
        ...activeChat.messages,
        { role: "user", content: displayMessage },
      ],
      title:
        activeChat.title === "New Chat"
          ? displayMessage.slice(0, 30)
          : activeChat.title,
      updatedAt: Date.now(),
    };

    await updateChat(activeProject.id, updatedChat);
    setIsThinking(true);

    const result = await window.electronAPI.sendMessage(
      fullMessage,
      activeProject.path,
      instructions
    );

    const agentMessage = {
      role: result.success ? "agent" : "system",
      content: result.success ? result.response : `Error: ${result.error}`,
    };

    const finalChat = {
      ...updatedChat,
      messages: [...updatedChat.messages, agentMessage],
      updatedAt: Date.now(),
    };

    await updateChat(activeProject.id, finalChat);
    setIsThinking(false);
  }

  return (
    <div style={{ ...styles.container, background: theme.bgMain }}>
      {/* Header */}
      <div
        style={{
          ...styles.header,
          background: theme.bgCard,
          borderBottom: `1px solid ${theme.border}`,
          boxShadow: theme.shadow,
        }}
      >
        <div style={styles.headerLeft}>
          <Bot size={20} color={theme.accent} />
          <span style={{ ...styles.headerTitle, color: theme.textPrimary }}>
            My Coding Agent
          </span>
        </div>

        <div style={styles.headerRight}>
          {activeProject && !showSettings && (
            <span
              style={{
                ...styles.headerStatus,
                color: theme.success,
                background: theme.successBg,
              }}
            >
              ● Online
            </span>
          )}

          {/* Theme Toggle */}
          <button
            style={{
              ...styles.themeToggle,
              background: theme.bgHover,
              color: theme.textSecondary,
            }}
            onClick={() => toggleTheme(mode === "light" ? "dark" : "light")}
            title="Toggle theme"
          >
            {mode === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>

      <div style={styles.main}>
        <Sidebar
          projects={projects}
          activeProject={activeProject}
          chats={chats}
          activeChat={activeChat}
          onAddProject={addProject}
          onRemoveProject={removeProject}
          onSwitchProject={switchProject}
          onNewChat={newChat}
          onSelectChat={setActiveChat}
          onDeleteChat={deleteChat}
          onOpenSettings={() => setShowSettings(true)}
          showSettings={showSettings}
        />

        {showSettings ? (
          <Settings
            onClose={() => setShowSettings(false)}
            onThemeChange={toggleTheme}
            currentTheme={mode}
          />
        ) : (
          <ChatArea
            activeProject={activeProject}
            activeChat={activeChat}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            toolStatuses={toolStatuses}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    WebkitAppRegion: "drag",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  headerTitle: {
    fontSize: "15px",
    fontWeight: "600",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    WebkitAppRegion: "no-drag",
  },
  headerStatus: {
    fontSize: "12px",
    padding: "3px 10px",
    borderRadius: "20px",
    fontWeight: "500",
  },
  themeToggle: {
    border: "none",
    borderRadius: "8px",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
};
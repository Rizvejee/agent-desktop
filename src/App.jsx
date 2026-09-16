import { useState, useEffect, useRef } from "react";
import { Bot, Moon, Sun } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import Settings from "./pages/Settings";
import ProjectDashboard from "./pages/ProjectDashboard";
import { useProjects } from "./hooks/useProjects";
import { useChats } from "./hooks/useChats";
import { useTheme } from "./ThemeContext";
import Terminal from "./components/Terminal";
import FileExplorer from "./components/FileExplorer";

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
    renameChat,
  } = useChats(activeProject);

  const [streamingContent, setStreamingContent] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [toolStatuses, setToolStatuses] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const abortRef = useRef(false);

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

    // streaming listener
    window.electronAPI.onChatStream((data) => {
      if (data.type === "chunk") {
        setStreamingContent((prev) => prev + data.chunk);
      } else if (data.type === "done") {
        setStreamingContent("");
      } else if (data.type === "tool") {
        setStreamingContent("");
      }
    });

    return () => {
      window.electronAPI.removeToolStatusListener();
      window.electronAPI.removeChatStreamListener();
    };
  }, []);

  // project switch پر dashboard کھولیں
  async function handleSwitchProject(project) {
    await switchProject(project);
    setShowDashboard(true);
    setShowSettings(false);
  }

  // chat select کریں — dashboard بند کریں
  function handleSelectChat(chat) {
    setActiveChat(chat);
    setShowDashboard(false);
  }

  // new chat
  async function handleNewChat(projectId) {
    await newChat(projectId);
    setShowDashboard(false);
  }

  function handleStopMessage() {
    abortRef.current = true;
    setIsThinking(false);
  }

  async function handleSendMessage(fullMessage, displayMessage) {
    if (!activeChat || !activeProject) return;

    abortRef.current = false;
    setToolStatuses([]);
    setStreamingContent("");

    const instrResult = await window.electronAPI.getInstructions(
      activeProject.id
    );
    const instructions = instrResult.success ? instrResult.instructions : "";

    const knowledgeResult = await window.electronAPI.getKnowledgeFiles(
      activeProject.id
    );
    let knowledgeContext = "";
    if (knowledgeResult.success && knowledgeResult.files.length > 0) {
      knowledgeContext =
        "\n\nKNOWLEDGE FILES:\n" +
        knowledgeResult.files
          .map((f) => `--- ${f.name} ---\n${f.content}`)
          .join("\n\n");
    }

    const fullMessageWithKnowledge = fullMessage + knowledgeContext;

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
      fullMessageWithKnowledge,
      activeProject.path,
      instructions
    );

    if (abortRef.current) {
      setIsThinking(false);
      setStreamingContent("");
      return;
    }

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
    setStreamingContent("");
  }

  // main area کیا دکھائیں
  function renderMainArea() {
    if (showSettings) {
      return (
        <Settings
          onClose={() => setShowSettings(false)}
          onThemeChange={toggleTheme}
          currentTheme={mode}
        />
      );
    }
    if (showTerminal) {
      return (
        <Terminal
          activeProject={activeProject}
          onClose={() => setShowTerminal(false)}
        />
      );
    }
    if (showFiles) {
    return (
    <FileExplorer
      activeProject={activeProject}
      onClose={() => setShowFiles(false)}
     />
     );
     }

    if (showDashboard && activeProject) {
      return (
        <ProjectDashboard
          project={activeProject}
          chats={chats}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
        />
      );
    }


    return (
      <ChatArea
        activeProject={activeProject}
        activeChat={activeChat}
        isThinking={isThinking}
        onSendMessage={handleSendMessage}
        onStopMessage={handleStopMessage}
        toolStatuses={toolStatuses}
        streamingContent={streamingContent}
      />
    );
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
          {activeProject && !showSettings && !showDashboard && (
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
          onSwitchProject={handleSwitchProject}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
          onOpenSettings={() => {
            setShowSettings(true);
            setShowDashboard(false);
            setShowFiles(false);   // ← نیا
          }}
          showSettings={showSettings}
          onOpenTerminal={() => {
            setShowTerminal(true);
            setShowSettings(false);
            setShowDashboard(false);
            setShowFiles(false);   // ← نیا
          }}
          showTerminal={showTerminal}
          onOpenFiles={() => {     // ← نیا
          setShowFiles(true);
          setShowSettings(false);
          setShowDashboard(false);
          setShowTerminal(false);
          }}
          showFiles={showFiles}    // ← نیا
          />
        

        {renderMainArea()}
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

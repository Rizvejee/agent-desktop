import { useState, useEffect, useRef } from "react";
import { Bot, Moon, Sun, Maximize2, Minus, X } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import Settings from "./pages/Settings";
import ProjectDashboard from "./pages/ProjectDashboard";
import { useProjects } from "./hooks/useProjects";
import { useChats } from "./hooks/useChats";
import { useTheme } from "./ThemeContext";
import FileExplorer from "./components/FileExplorer";
import PreviewPanel from "./components/PreviewPanel";

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
  const [showFiles, setShowFiles] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ✅ FIX: Refs — race condition اور stop handling کے لیے
  const abortRef = useRef(false);
  const isSendingRef = useRef(false); 
  const currentChatIdRef = useRef(null); 

  // ═══════════════════════════════════════════════════════
  // LISTENERS SETUP
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const toolListener = window.electronAPI.onToolStatus((data) => {
      setToolStatuses((prev) => {
        const existing = prev.findIndex(
          (t) => t.tool === data.tool && JSON.stringify(t.input) === JSON.stringify(data.input)
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    const chatListener = window.electronAPI.onChatStream((data) => {
      if (data.type === "chunk") {
        setStreamingContent((prev) => prev + data.chunk);
      } else if (data.type === "done") {
        setStreamingContent("");
      } else if (data.type === "tool") {
        setStreamingContent("");
      } else if (data.type === "error") {
        setStreamingContent("");
        setIsThinking(false);
        isSendingRef.current = false;
      }
    });

    return () => {
      window.electronAPI.removeToolStatusListener();
      window.electronAPI.removeChatStreamListener();
    };
  }, []);

  // ═══════════════════════════════════════════════════════
  // VIEW SWITCHING
  // ═══════════════════════════════════════════════════════
  async function handleSwitchProject(project) {
    await switchProject(project);
    setShowDashboard(true);
    setShowSettings(false);
    setShowFiles(false);
    setShowPreview(false);
  }

  function handleSelectChat(chat) {
    setActiveChat(chat);
    setShowDashboard(false);
    currentChatIdRef.current = chat.id;
  }

  async function handleNewChat(projectId) {
    await newChat(projectId);
    setShowDashboard(false);
  }

  function handleStopMessage() {
    abortRef.current = true;
    setIsThinking(false);
    isSendingRef.current = false;
    setStreamingContent("");
    setToolStatuses([]);
  }

  // ═══════════════════════════════════════════════════════
  // 💬 SEND MESSAGE
  // ═══════════════════════════════════════════════════════
  async function handleSendMessage(fullMessage, displayMessage) {
    if (!activeChat || !activeProject) return;

    if (isSendingRef.current) {
      console.warn("⚠️ Already sending a message. Please wait.");
      return;
    }

    isSendingRef.current = true;
    abortRef.current = false;
    setToolStatuses([]);
    setStreamingContent("");

    try {
      const instrResult = await window.electronAPI.getInstructions(activeProject.id);
      const instructions = instrResult.success ? instrResult.instructions : "";

      let knowledgeContext = "";
      try {
        const knowledgeResult = await window.electronAPI.getKnowledgeFilesContent(activeProject.id);
        if (knowledgeResult.success && knowledgeResult.files.length > 0) {
          const keywords = displayMessage.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          const relevantFiles = knowledgeResult.files.filter(f => {
            const searchText = `${f.name} ${f.content}`.toLowerCase();
            return keywords.some(word => searchText.includes(word));
          });

          if (relevantFiles.length > 0) {
            knowledgeContext = "\n\n📚 RELEVANT KNOWLEDGE FILES:\n" +
              relevantFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join("\n\n");
          } else if (knowledgeResult.files.length <= 3) {
            knowledgeContext = "\n\n📚 PROJECT KNOWLEDGE FILES:\n" +
              knowledgeResult.files.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join("\n\n");
          }
        }
      } catch (error) {
        console.error("Error loading knowledge files:", error);
      }

      const fullMessageWithKnowledge = fullMessage + knowledgeContext;

      const updatedChat = {
        ...activeChat,
        messages: [...activeChat.messages, { role: "user", content: displayMessage }],
        title: activeChat.title === "New Chat" ? displayMessage.slice(0, 30) : activeChat.title,
        updatedAt: Date.now(),
      };
      await updateChat(activeProject.id, updatedChat);

      setIsThinking(true);

      const result = await window.electronAPI.sendMessage(
        fullMessageWithKnowledge,
        activeProject.path,
        instructions,
        activeProject.id
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

      if (finalChat.messages.length >= 20) {
        try {
          const oldMessages = finalChat.messages.slice(0, -10);
          const summaryText = oldMessages
            .filter(m => m.role !== "system")
            .map(m => `${m.role}: ${m.content.slice(0, 100)}`)
            .join("\n");
          await window.electronAPI.saveChatSummary(activeProject.id, summaryText, oldMessages.length);
        } catch (error) {
          console.error("Error saving chat summary:", error);
        }
      }

    } catch (error) {
      console.error("❌ Error in handleSendMessage:", error);
      const errorChat = {
        ...activeChat,
        messages: [
          ...activeChat.messages,
          { role: "user", content: displayMessage },
          { role: "system", content: `Error: ${error.message}` },
        ],
        updatedAt: Date.now(),
      };
      await updateChat(activeProject.id, errorChat);
    } finally {
      setIsThinking(false);
      setStreamingContent("");
      setToolStatuses([]);
      isSendingRef.current = false;
    }
  }

  // ═══════════════════════════════════════════════════════
  // RENDER MAIN AREA
  // ═══════════════════════════════════════════════════════
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
    if (showPreview) {
      return (
        <PreviewPanel
          activeProject={activeProject}
          onClose={() => setShowPreview(false)}
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

  // ═══════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════
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
        <div style={{ ...styles.headerLeft, WebkitAppRegion: "drag", flex: 1 }}>
          <Bot size={20} color={theme.accent} />
          <span style={{ ...styles.headerTitle, color: theme.textPrimary }}>
            My Coding Agent
          </span>
        </div>
        <div style={{ ...styles.headerRight, WebkitAppRegion: "no-drag" }}>
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
          <div style={{ display: "flex", gap: "4px", marginLeft: "12px" }}>
            <button
              style={{ ...styles.windowBtn, background: "transparent", color: theme.textMuted }}
              onClick={() => window.electronAPI.minimizeWindow()}
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              style={{ ...styles.windowBtn, background: "transparent", color: theme.textMuted }}
              onClick={() => window.electronAPI.maximizeWindow()}
              title="Maximize/Restore"
            >
              <Maximize2 size={14} />
            </button>
            <button
              style={{ ...styles.windowBtn, background: "transparent", color: theme.textMuted }}
              onClick={() => window.electronAPI.closeWindow()}
              title="Close"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = theme.textMuted;
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
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
            setShowFiles(false);
            setShowPreview(false);
          }}
          showSettings={showSettings}
          onOpenFiles={() => {
            setShowFiles(true);
            setShowSettings(false);
            setShowDashboard(false);
            setShowPreview(false);
          }}
          showFiles={showFiles}
          onOpenPreview={() => {
            setShowPreview(true);
            setShowSettings(false);
            setShowDashboard(false);
            setShowFiles(false);
          }}
          showPreview={showPreview}
        />
        {renderMainArea()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "16px 20px",
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
    WebkitAppRegion: "drag",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    WebkitAppRegion: "no-drag",
  },
  windowBtn: {
    border: "none",
    borderRadius: "6px",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    transition: "all 0.2s",
  },
  headerTitle: {
    fontSize: "15px",
    fontWeight: "600",
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
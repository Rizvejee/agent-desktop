import { useState, useEffect } from "react";
import { Bot } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import Settings from "./pages/Settings";
import { useProjects } from "./hooks/useProjects";
import { useChats } from "./hooks/useChats";

export default function App() {
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

  const [showSettings, setShowSettings] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [toolStatuses, setToolStatuses] = useState([]);

  useEffect(() => {
  window.electronAPI.onToolStatus((data) => {
    setToolStatuses((prev) => {
      const existing = prev.findIndex(
        (t) => t.tool === data.tool &&
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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Bot size={18} color="#2563eb" />
        <span style={styles.headerTitle}>My Coding Agent</span>
        {activeProject && !showSettings && (
          <span style={styles.headerStatus}>● Online</span>
        )}
      </div>

      <div style={styles.main}>
        {/* Sidebar */}
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

        {/* Main Area */}
        {showSettings ? (
        <Settings onClose={() => setShowSettings(false)} />
         ) : showProjectSettings ? (
        <ProjectSettings
        activeProject={activeProject}
        onClose={() => setShowProjectSettings(false)}
        />
        ) : (
        <ChatArea
        activeProject={activeProject}
        activeChat={activeChat}
        isThinking={isThinking}
        onSendMessage={handleSendMessage}
        toolStatuses={toolStatuses}
        onOpenProjectSettings={() => setShowProjectSettings(true)}
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
    background: "#f5f5f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #ebebeb",
    padding: "13px 20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    WebkitAppRegion: "drag",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  headerStatus: {
    fontSize: "12px",
    color: "#16a34a",
    background: "#dcfce7",
    padding: "3px 10px",
    borderRadius: "20px",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
};

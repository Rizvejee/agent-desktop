import { useState, useEffect } from "react";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createNewChat() {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [
      {
        role: "agent",
        content:
          "Hello! I am Coder, your personal AI coding assistant.\n" +
          "How can I help you today?\n" +
          "Type /help to see available commands.",
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function useChats(activeProject) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    if (activeProject) {
      loadChats(activeProject.id);
    } else {
      setChats([]);
      setActiveChat(null);
    }
  }, [activeProject?.id]);

  async function loadChats(projectId) {
    try {
      const result = await window.electronAPI.getChats(projectId);
      if (result.success) {
        if (result.chats.length > 0) {
          setChats(result.chats);
          setActiveChat(result.chats[0]);
        } else {
          const newChat = createNewChat();
          setChats([newChat]);
          setActiveChat(newChat);
          await window.electronAPI.saveChat(projectId, newChat);
        }
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      // ✅ Error میں بھی default chat بنائیں
      const newChat = createNewChat();
      setChats([newChat]);
      setActiveChat(newChat);
    }
  }

  // ✅ FIX: activeProject کا safe استعمال
  async function newChat(projectId) {
    const chat = createNewChat();

    // ✅ Functional state update — stale closure سے بچاؤ
    setChats((prev) => [chat, ...prev]);
    setActiveChat(chat);

    try {
      await window.electronAPI.saveChat(projectId, chat);

      // ✅ Safe: activeProject سے نہیں، parameter سے path لیں
      if (activeProject && activeProject.path) {
        await window.electronAPI.resetAgent(activeProject.path, projectId);
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  }

  // ✅ FIX: Stale closure bug — functional update استعمال کریں
  async function deleteChat(projectId, chatId) {
    try {
      await window.electronAPI.deleteChat(projectId, chatId);

      // ✅ Functional update — stale state نہیں
      setChats((prev) => {
        const remaining = prev.filter((c) => c.id !== chatId);

        // اگر delete ہونے والا chat active ہے تو نیا active set کریں
        if (activeChat?.id === chatId) {
          if (remaining.length > 0) {
            setActiveChat(remaining[0]);
          } else {
            const chat = createNewChat();
            // ✅ Async call باہر — state update کے اندر نہیں
            window.electronAPI.saveChat(projectId, chat).then(() => {
              setChats([chat]);
              setActiveChat(chat);
            });
          }
        }

        return remaining;
      });
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  }

  async function updateChat(projectId, updatedChat) {
    setActiveChat(updatedChat);
    // ✅ Functional update
    setChats((prev) =>
      prev.map((c) => (c.id === updatedChat.id ? updatedChat : c))
    );

    try {
      await window.electronAPI.saveChat(projectId, updatedChat);
    } catch (error) {
      console.error("Error updating chat:", error);
    }
  }

  async function renameChat(projectId, chatId, newTitle) {
    try {
      await window.electronAPI.renameChat(projectId, chatId, newTitle);

      // ✅ Functional update
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, title: newTitle } : c
        )
      );

      if (activeChat?.id === chatId) {
        setActiveChat((prev) => ({ ...prev, title: newTitle }));
      }
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
  }

  return {
    chats,
    activeChat,
    setActiveChat,
    newChat,
    deleteChat,
    updateChat,
    renameChat,
  };
}

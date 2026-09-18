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
          "Hello! I am Coder, your personal AI coding assistant.\n\nHow can I help you today?\n\nType /help to see available commands.",
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
  }

  async function newChat(projectId) {
    const chat = createNewChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChat(chat);
    await window.electronAPI.saveChat(projectId, chat);
    await window.electronAPI.resetAgent(activeProject.path, activeProject.id);
  }

  async function deleteChat(projectId, chatId) {
    await window.electronAPI.deleteChat(projectId, chatId);
    const remaining = chats.filter((c) => c.id !== chatId);
    setChats(remaining);

    if (activeChat?.id === chatId) {
      if (remaining.length > 0) {
        setActiveChat(remaining[0]);
      } else {
        const chat = createNewChat();
        setChats([chat]);
        setActiveChat(chat);
        await window.electronAPI.saveChat(projectId, chat);
      }
    }
  }

  async function updateChat(projectId, updatedChat) {
    setActiveChat(updatedChat);
    setChats((prev) =>
      prev.map((c) => (c.id === updatedChat.id ? updatedChat : c))
    );
    await window.electronAPI.saveChat(projectId, updatedChat);
  }

  async function renameChat(projectId, chatId, newTitle) {
  await window.electronAPI.renameChat(projectId, chatId, newTitle);
  setChats((prev) =>
    prev.map((c) =>
      c.id === chatId ? { ...c, title: newTitle } : c
    )
  );
  if (activeChat?.id === chatId) {
    setActiveChat((prev) => ({ ...prev, title: newTitle }));
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
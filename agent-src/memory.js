const fs = require("fs");
const path = require("path");

class Memory {
  constructor(memoryPath) {
    this.memoryPath = memoryPath;

    // ✅ 3 الگ فائلیں — بہتر organization
    this.memoryFile = path.join(memoryPath, "agent-memory.json");
    this.knowledgeIndexFile = path.join(memoryPath, "knowledge-index.json");
    this.chatSummaryFile = path.join(memoryPath, "chat-summary.json");

    // ✅ Write queue — concurrent writes safe ہوں گی
    this.writeQueue = Promise.resolve();

    // Data لوڈ کریں
    this.data = this.loadMemory();
    this.knowledgeIndex = this.loadKnowledgeIndex();
    this.chatSummary = this.loadChatSummary();
  }

  // ═══════════════════════════════════════════════════════
  // 📂 LOAD METHODS
  // ═══════════════════════════════════════════════════════

  loadMemory() {
    const defaultData = {
      preferences: [],
      projectDecisions: [],
      completedTasks: [],
      notes: [],
    };

    if (!fs.existsSync(this.memoryFile)) {
      return defaultData;
    }

    try {
      const content = fs.readFileSync(this.memoryFile, "utf-8");
      const parsed = JSON.parse(content);
      return { ...defaultData, ...parsed };
    } catch {
      return defaultData;
    }
  }

  loadKnowledgeIndex() {
    if (!fs.existsSync(this.knowledgeIndexFile)) {
      return {};
    }

    try {
      const content = fs.readFileSync(this.knowledgeIndexFile, "utf-8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  loadChatSummary() {
    const defaultSummary = {
      olderMessages: "",
      lastUpdated: null,
      messageCount: 0,
    };

    if (!fs.existsSync(this.chatSummaryFile)) {
      return defaultSummary;
    }

    try {
      const content = fs.readFileSync(this.chatSummaryFile, "utf-8");
      const parsed = JSON.parse(content);
      return { ...defaultSummary, ...parsed };
    } catch {
      return defaultSummary;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 💾 SAVE METHODS (Queue-based — safe)
  // ═══════════════════════════════════════════════════════

  saveMemory() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }

    this.writeQueue = this.writeQueue.then(() => {
      return new Promise((resolve) => {
        try {
          fs.writeFileSync(
            this.memoryFile,
            JSON.stringify(this.data, null, 2),
            "utf-8"
          );
        } catch (error) {
          console.error("❌ Memory save error:", error);
        }
        resolve();
      });
    });

    return this.writeQueue;
  }

  saveKnowledgeIndex() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }

    this.writeQueue = this.writeQueue.then(() => {
      return new Promise((resolve) => {
        try {
          fs.writeFileSync(
            this.knowledgeIndexFile,
            JSON.stringify(this.knowledgeIndex, null, 2),
            "utf-8"
          );
        } catch (error) {
          console.error("❌ Knowledge index save error:", error);
        }
        resolve();
      });
    });

    return this.writeQueue;
  }

  saveChatSummary() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }

    this.writeQueue = this.writeQueue.then(() => {
      return new Promise((resolve) => {
        try {
          fs.writeFileSync(
            this.chatSummaryFile,
            JSON.stringify(this.chatSummary, null, 2),
            "utf-8"
          );
        } catch (error) {
          console.error("❌ Chat summary save error:", error);
        }
        resolve();
      });
    });

    return this.writeQueue;
  }

  // ═══════════════════════════════════════════════════════
  // 🧠 AGENT MEMORY (preferences, decisions, tasks, notes)
  // ═══════════════════════════════════════════════════════

  remember(category, item) {
    if (!this.data[category]) {
      this.data[category] = [];
    }

    if (!this.data[category].includes(item)) {
      this.data[category].push(item);
      this.saveMemory();
      return `✅ Remembered: ${item}`;
    }
    return `Already remembered: ${item}`;
  }

  forget(category, item) {
    if (!this.data[category]) {
      return `Nothing to forget in: ${category}`;
    }

    this.data[category] = this.data[category].filter((i) => i !== item);
    this.saveMemory();
    return `✅ Forgotten: ${item}`;
  }

  getAll() {
    return this.data;
  }

  clearAll() {
    this.data = {
      preferences: [],
      projectDecisions: [],
      completedTasks: [],
      notes: [],
    };
    this.saveMemory();
    return "✅ Memory cleared";
  }

  // ═══════════════════════════════════════════════════════
  // 📚 KNOWLEDGE INDEX (File -> Summary mapping)
  // ═══════════════════════════════════════════════════════

  /**
   * Knowledge file کا index add کریں
   * @param {string} fileName - فائل کا نام
   * @param {string} summary - 100 الفاظ کی summary
   */
  addKnowledgeIndex(fileName, summary) {
    this.knowledgeIndex[fileName] = {
      summary: summary,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveKnowledgeIndex();
    return `✅ Knowledge indexed: ${fileName}`;
  }

  updateKnowledgeIndex(fileName, summary) {
    if (!this.knowledgeIndex[fileName]) {
      return `❌ File not in index: ${fileName}`;
    }

    this.knowledgeIndex[fileName] = {
      summary: summary,
      addedAt: this.knowledgeIndex[fileName].addedAt,
      updatedAt: new Date().toISOString(),
    };
    this.saveKnowledgeIndex();
    return `✅ Knowledge updated: ${fileName}`;
  }

  removeKnowledgeIndex(fileName) {
    if (this.knowledgeIndex[fileName]) {
      delete this.knowledgeIndex[fileName];
      this.saveKnowledgeIndex();
      return `✅ Removed from index: ${fileName}`;
    }
    return `File not in index: ${fileName}`;
  }

  getKnowledgeIndex() {
    return this.knowledgeIndex;
  }

  /**
   * Index کو readable string میں convert کریں (Agent کے لیے)
   */
  getKnowledgeIndexString() {
    const entries = Object.entries(this.knowledgeIndex);
    if (entries.length === 0) {
      return "No knowledge files indexed yet.";
    }

    const lines = ["KNOWLEDGE FILES INDEX:"];
    entries.forEach(([fileName, data]) => {
      lines.push(`- ${fileName}: ${data.summary}`);
    });

    return lines.join("\n");
  }

  // ═══════════════════════════════════════════════════════
  // 💬 CHAT SUMMARY (Smart History)
  // ═══════════════════════════════════════════════════════

  /**
   * پرانی messages کا summary save کریں
   * @param {string} summary - 2-3 لائنوں کا summary
   * @param {number} messageCount - کتنی messages summarize ہوئیں
   */
  saveChatSummary(summary, messageCount) {
    this.chatSummary = {
      olderMessages: summary,
      lastUpdated: new Date().toISOString(),
      messageCount: messageCount,
    };
    this.saveChatSummary();
    return `✅ Chat summary saved (${messageCount} messages)`;
  }

  getChatSummary() {
    return this.chatSummary;
  }

  getChatSummaryString() {
    if (!this.chatSummary.olderMessages) {
      return "";
    }

    return `EARLIER CONVERSATION SUMMARY (${this.chatSummary.messageCount} messages):\n${this.chatSummary.olderMessages}`;
  }

  clearChatSummary() {
    this.chatSummary = {
      olderMessages: "",
      lastUpdated: null,
      messageCount: 0,
    };
    this.saveChatSummary();
    return "✅ Chat summary cleared";
  }

  // ═══════════════════════════════════════════════════════
  // 📊 MEMORY STRING (Agent کے system prompt کے لیے)
  // ═══════════════════════════════════════════════════════

  /**
   * مختصر memory string — token-efficient
   */
  getMemoryString() {
    const lines = [];

    // Preferences — آخری 5
    if (this.data.preferences.length > 0) {
      lines.push("USER PREFERENCES:");
      const recent = this.data.preferences.slice(-5);
      recent.forEach((p) => lines.push(`- ${p}`));
      if (this.data.preferences.length > 5) {
        lines.push(`  (...and ${this.data.preferences.length - 5} more)`);
      }
    }

    // Project Decisions — آخری 10
    if (this.data.projectDecisions.length > 0) {
      lines.push("");
      lines.push("PROJECT DECISIONS:");
      const recent = this.data.projectDecisions.slice(-10);
      recent.forEach((d) => lines.push(`- ${d}`));
    }

    // Completed Tasks — آخری 10
    if (this.data.completedTasks.length > 0) {
      lines.push("");
      lines.push("COMPLETED TASKS:");
      const recent = this.data.completedTasks.slice(-10);
      recent.forEach((t) => lines.push(`- ${t}`));
    }

    // Notes — آخری 5
    if (this.data.notes.length > 0) {
      lines.push("");
      lines.push("NOTES:");
      const recent = this.data.notes.slice(-5);
      recent.forEach((n) => lines.push(`- ${n}`));
    }

    // Knowledge Index
    if (Object.keys(this.knowledgeIndex).length > 0) {
      lines.push("");
      lines.push(this.getKnowledgeIndexString());
    }

    // Chat Summary
    const chatSummaryStr = this.getChatSummaryString();
    if (chatSummaryStr) {
      lines.push("");
      lines.push(chatSummaryStr);
    }

    return lines.length > 0 ? lines.join("\n") : "No memory yet.";
  }

  // ═══════════════════════════════════════════════════════
  // 🎯 TOKEN BUDGET HELPERS
  // ═══════════════════════════════════════════════════════

  /**
   * Token count کا rough estimate (1 token ≈ 4 characters English, 2 Urdu)
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Urdu characters کا count
    const urduChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const otherChars = text.length - urduChars;

    // Urdu: ~2 chars per token, English: ~4 chars per token
    return Math.ceil(urduChars / 2 + otherChars / 4);
  }

  /**
   * Text کو specific token limit تک truncate کریں
   */
  truncateToTokens(text, maxTokens) {
    if (!text) return "";

    const currentTokens = this.estimateTokens(text);
    if (currentTokens <= maxTokens) return text;

    // Approximate characters to keep
    const ratio = maxTokens / currentTokens;
    const targetLength = Math.floor(text.length * ratio);

    return text.slice(0, targetLength) + "\n... [truncated to fit token budget]";
  }

  // ═══════════════════════════════════════════════════════
  // 🔄 WAIT FOR SAVE (tests کے لیے)
  // ═══════════════════════════════════════════════════════

  async waitForSave() {
    await this.writeQueue;
  }
}

module.exports = Memory;

const fs = require("fs");
const path = require("path");

class Memory {
  constructor(memoryPath) {
    this.memoryPath = memoryPath;
    
    // ✅ 3 الگ فائلیں — بہتر organization (Point 10, 11, 24)
    this.memoryFile = path.join(memoryPath, "agent-memory.json");
    this.knowledgeIndexFile = path.join(memoryPath, "knowledge-index.json");
    this.chatSummaryFile = path.join(memoryPath, "chat-summary.json");
    this.activePlanFile = path.join(memoryPath, "active-plan.json"); // ✅ نیا: Plan الگ فائل میں

    // ✅ Write queue — concurrent writes safe ہوں گی
    this.writeQueue = Promise.resolve();

    // Data لوڈ کریں
    this.data = this.loadMemory();
    this.knowledgeIndex = this.loadKnowledgeIndex();
    this.chatSummary = this.loadChatSummary();
    
    // ✅ نیا: Active Plan کو memory سے الگ رکھنا (Point 24)
    // یہ memory category نہیں ہے — یہ temporary working state ہے
    this.activePlan = this.loadActivePlan();

    // ✅ Backward compatibility: پرانی data سے activePlan ہٹائیں (تاکہ duplicate نہ ہو)
    if (this.data.activePlan !== undefined) {
      const oldPlan = this.data.activePlan;
      delete this.data.activePlan;
      if (oldPlan && !this.activePlan) {
        this.activePlan = oldPlan;
        this.saveActivePlanToFile();
      }
      this.saveMemory();
    }

    // ✅ Point 9: projectStructure کو مکمل ہٹائیں (Deprecated)
    if (this.data.projectStructure !== undefined) {
      delete this.data.projectStructure;
      this.saveMemory();
    }
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

  // ✅ نیا: Active Plan کو الگ فائل سے لوڈ کریں
  loadActivePlan() {
    if (!fs.existsSync(this.activePlanFile)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(this.activePlanFile, "utf-8"));
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 💾 SAVE METHODS (Queue-based — safe)
  // ═══════════════════════════════════════════════════════
  ensureDir() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }
  }

  saveMemory() {
    this.ensureDir();
    this.writeQueue = this.writeQueue.then(() => {
      return new Promise((resolve) => {
        try {
          // ✅ activePlan اور projectStructure کو memory file میں save نہ کریں
          const dataToSave = { ...this.data };
          delete dataToSave.activePlan;
          delete dataToSave.projectStructure;
          
          fs.writeFileSync(
            this.memoryFile,
            JSON.stringify(dataToSave, null, 2),
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
    this.ensureDir();
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

  saveChatSummaryToFile() {
    this.ensureDir();
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

  // ✅ نیا: Active Plan کو الگ فائل میں save کریں
  saveActivePlanToFile() {
    this.ensureDir();
    this.writeQueue = this.writeQueue.then(() => {
      return new Promise((resolve) => {
        try {
          if (this.activePlan) {
            fs.writeFileSync(
              this.activePlanFile,
              JSON.stringify(this.activePlan, null, 2),
              "utf-8"
            );
          } else if (fs.existsSync(this.activePlanFile)) {
            // اگر plan null ہے تو فائل ڈیلیٹ کر دیں
            fs.unlinkSync(this.activePlanFile);
          }
        } catch (error) {
          console.error("❌ Active plan save error:", error);
        }
        resolve();
      });
    });
    return this.writeQueue;
  }

  // ═══════════════════════════════════════════════════════
  // 🧠 AGENT MEMORY (صرف 4 categories - Point 7, 24)
  // ═══════════════════════════════════════════════════════
  remember(category, item) {
    // ✅ Safety: activePlan کو memory میں save نہ ہونے دیں (Point 24)
    if (category === "activePlan") {
      return `❌ Error: activePlan is not a memory category. Use saveActivePlan() instead.`;
    }
    // ✅ Safety: projectStructure deprecated ہے (Point 9)
    if (category === "projectStructure") {
      return `❌ Error: projectStructure is deprecated. Use actual project files instead.`;
    }
    
    const validCategories = ["preferences", "projectDecisions", "completedTasks", "notes"];
    if (!validCategories.includes(category)) {
      return `❌ Error: Invalid category "${category}". Use: ${validCategories.join(", ")}`;
    }

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
  // 📋 ACTIVE PLAN (Memory سے الگ — Temporary State)
  // ✅ Point 5, 24: Plan کو Memory category نہ بناؤ
  // ═══════════════════════════════════════════════════════

  /**
   * Active Plan save کریں (الگ فائل میں)
   * @param {Object} plan - Plan object { taskDescription, totalSteps, steps: [...] }
   */
  saveActivePlan(plan) {
    this.activePlan = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };
    this.saveActivePlanToFile();
    return `✅ Active plan saved: ${plan.taskDescription || "Untitled"}`;
  }

  /**
   * Active Plan حاصل کریں
   */
  getActivePlan() {
    return this.activePlan;
  }

  /**
   * Active Plan clear کریں
   */
  clearActivePlan() {
    this.activePlan = null;
    this.saveActivePlanToFile();
    return "✅ Active plan cleared";
  }

  /**
   * Plan کا step update کریں
   * @param {number} stepIndex - Step number (0-based)
   * @param {string} status - "pending" | "in-progress" | "done"
   */
  updatePlanStep(stepIndex, status) {
    if (!this.activePlan || !this.activePlan.steps) {
      return `❌ No active plan found`;
    }
    if (stepIndex < 0 || stepIndex >= this.activePlan.steps.length) {
      return `❌ Invalid step index: ${stepIndex}`;
    }
    this.activePlan.steps[stepIndex].status = status;
    this.activePlan.updatedAt = new Date().toISOString();
    this.saveActivePlanToFile();
    return `✅ Step ${stepIndex + 1} marked as ${status}`;
  }

  /**
   * Plan کی progress حاصل کریں
   */
  getPlanProgress() {
    if (!this.activePlan || !this.activePlan.steps) {
      return null;
    }
    const total = this.activePlan.steps.length;
    const done = this.activePlan.steps.filter(s => s.status === "done").length;
    const inProgress = this.activePlan.steps.filter(s => s.status === "in-progress").length;
    const pending = this.activePlan.steps.filter(s => s.status === "pending").length;
    return {
      total,
      done,
      inProgress,
      pending,
      percentage: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }

  // ═══════════════════════════════════════════════════════
  // 📚 KNOWLEDGE INDEX (Point 10: Memory سے الگ)
  // ═══════════════════════════════════════════════════════
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
  // 💬 CHAT SUMMARY (Point 11: Memory سے الگ)
  // ═══════════════════════════════════════════════════════
  saveChatSummaryData(summary, messageCount) {
    this.chatSummary = {
      olderMessages: summary,
      lastUpdated: new Date().toISOString(),
      messageCount: messageCount,
    };
    this.saveChatSummaryToFile();
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
    this.saveChatSummaryToFile();
    return "✅ Chat summary cleared";
  }

  // ═══════════════════════════════════════════════════════
  // 📊 MEMORY STRING (Agent کے system prompt کے لیے)
  // ✅ Point 21: Duplicate information نہ ہو (activePlan شامل نہیں)
  // ═══════════════════════════════════════════════════════
  getMemoryString() {
    const lines = [];

    if (this.data.preferences.length > 0) {
      lines.push("USER PREFERENCES:");
      const recent = this.data.preferences.slice(-5);
      recent.forEach((p) => lines.push(`- ${p}`));
      if (this.data.preferences.length > 5) {
        lines.push(`  (...and ${this.data.preferences.length - 5} more)`);
      }
    }

    if (this.data.projectDecisions.length > 0) {
      lines.push("");
      lines.push("PROJECT DECISIONS:");
      const recent = this.data.projectDecisions.slice(-10);
      recent.forEach((d) => lines.push(`- ${d}`));
    }

    if (this.data.completedTasks.length > 0) {
      lines.push("");
      lines.push("COMPLETED TASKS:");
      const recent = this.data.completedTasks.slice(-10);
      recent.forEach((t) => lines.push(`- ${t}`));
    }

    if (this.data.notes.length > 0) {
      lines.push("");
      lines.push("NOTES:");
      const recent = this.data.notes.slice(-5);
      recent.forEach((n) => lines.push(`- ${n}`));
    }

    if (Object.keys(this.knowledgeIndex).length > 0) {
      lines.push("");
      lines.push(this.getKnowledgeIndexString());
    }

    const chatSummaryStr = this.getChatSummaryString();
    if (chatSummaryStr) {
      lines.push("");
      lines.push(chatSummaryStr);
    }

    // ✅ REMOVED: activePlan — یہ memory نہیں ہے، الگ state ہے
    // ✅ REMOVED: projectStructure — deprecated

    return lines.length > 0 ? lines.join("\n") : "No memory yet.";
  }

  // ═══════════════════════════════════════════════════════
  // 🎯 TOKEN BUDGET HELPERS
  // ═══════════════════════════════════════════════════════
  estimateTokens(text) {
    if (!text) return 0;
    const urduChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const otherChars = text.length - urduChars;
    return Math.ceil(urduChars / 2 + otherChars / 4);
  }

  truncateToTokens(text, maxTokens) {
    if (!text) return "";
    const currentTokens = this.estimateTokens(text);
    if (currentTokens <= maxTokens) return text;
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
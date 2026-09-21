const fs = require("fs");
const path = require("path");

class Memory {
  constructor(memoryPath) {
    this.memoryPath = memoryPath;
    this.memoryFile = path.join(memoryPath, "agent-memory.json");
    this.writeQueue = Promise.resolve(); // ✅ Concurrent writes fix
    this.data = this.load();
  }

  // ─── Load Memory ─────────────────────────────────────
  load() {
    const defaultData = {
      preferences: [],
      projectDecisions: [],
      completedTasks: [],
      notes: [],
      activePlan: null, // ✅ نیا: Plan tracking
      knowledgeIndex: [], // ✅ نیا: Knowledge files کا index
    };

    if (!fs.existsSync(this.memoryFile)) {
      return defaultData;
    }

    try {
      const content = fs.readFileSync(this.memoryFile, "utf-8");
      const parsed = JSON.parse(content);
      // پرانے data کے ساتھ نئے fields merge کریں
      return {
        ...defaultData,
        ...parsed,
        activePlan: parsed.activePlan || null,
        knowledgeIndex: parsed.knowledgeIndex || [],
      };
    } catch {
      return defaultData;
    }
  }

  // ─── Safe Save (Queue-based) ─────────────────────────
  save() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }

    // ✅ Write queue — concurrent calls safe ہوں گی
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

  // ─── Remember / Forget ───────────────────────────────
  remember(category, item) {
    if (!this.data[category]) {
      this.data[category] = [];
    }

    if (!this.data[category].includes(item)) {
      this.data[category].push(item);
      this.save();
      return `✅ Remembered: ${item}`;
    }
    return `Already remembered: ${item}`;
  }

  forget(category, item) {
    if (!this.data[category]) {
      return `Nothing to forget in: ${category}`;
    }

    this.data[category] = this.data[category].filter((i) => i !== item);
    this.save();
    return `✅ Forgotten: ${item}`;
  }

  // ═══════════════════════════════════════════════════════
  // 🆕 ACTIVE PLAN MANAGEMENT (Step-by-Step Tracking)
  // ═══════════════════════════════════════════════════════

  /**
   * نیا plan save کریں
   * @param {Object} plan - { sourceFile, taskDescription, steps: [{id, description}] }
   */
  savePlan(plan) {
    this.data.activePlan = {
      sourceFile: plan.sourceFile || null,
      taskDescription: plan.taskDescription || "",
      totalSteps: plan.steps.length,
      currentStep: 1,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      steps: plan.steps.map((step, idx) => ({
        id: idx + 1,
        description: step.description || step,
        status: "pending", // pending | in-progress | done | skipped
        completedAt: null,
        result: null,
      })),
    };
    this.save();
    return this.data.activePlan;
  }

  /**
   * موجودہ plan load کریں
   */
  loadPlan() {
    return this.data.activePlan;
  }

  /**
   * اگلا pending step حاصل کریں
   */
  getNextStep() {
    if (!this.data.activePlan) return null;

    const nextStep = this.data.activePlan.steps.find(
      (s) => s.status === "pending"
    );
    return nextStep || null;
  }

  /**
   * موجودہ step کو in-progress mark کریں
   */
  startStep(stepId) {
    if (!this.data.activePlan) return null;

    const step = this.data.activePlan.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = "in-progress";
      step.startedAt = new Date().toISOString();
      this.data.activePlan.currentStep = stepId;
      this.data.activePlan.lastUpdated = new Date().toISOString();
      this.save();
    }
    return step;
  }

  /**
   * Step کو done mark کریں
   */
  completeStep(stepId, result = null) {
    if (!this.data.activePlan) return null;

    const step = this.data.activePlan.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = "done";
      step.completedAt = new Date().toISOString();
      step.result = result;
      this.data.activePlan.lastUpdated = new Date().toISOString();

      // completedTasks میں بھی add کریں
      const taskSummary = `Step ${stepId}: ${step.description}`;
      if (!this.data.completedTasks.includes(taskSummary)) {
        this.data.completedTasks.push(taskSummary);
      }

      this.save();
    }
    return step;
  }

  /**
   * Step کو skip کریں
   */
  skipStep(stepId, reason = "") {
    if (!this.data.activePlan) return null;

    const step = this.data.activePlan.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = "skipped";
      step.skipReason = reason;
      step.completedAt = new Date().toISOString();
      this.data.activePlan.lastUpdated = new Date().toISOString();
      this.save();
    }
    return step;
  }

  /**
   * پورا plan clear کریں
   */
  clearPlan() {
    this.data.activePlan = null;
    this.save();
    return "✅ Plan cleared";
  }

  /**
   * Plan کی progress report (token-efficient summary)
   */
  getPlanSummary() {
    if (!this.data.activePlan) return null;

    const plan = this.data.activePlan;
    const done = plan.steps.filter((s) => s.status === "done").length;
    const pending = plan.steps.filter((s) => s.status === "pending").length;
    const inProgress = plan.steps.filter((s) => s.status === "in-progress").length;

    return {
      taskDescription: plan.taskDescription,
      totalSteps: plan.totalSteps,
      completed: done,
      inProgress: inProgress,
      pending: pending,
      currentStep: plan.currentStep,
      nextStep: this.getNextStep(),
      percentComplete: Math.round((done / plan.totalSteps) * 100),
    };
  }

  // ═══════════════════════════════════════════════════════
  // 🆕 KNOWLEDGE FILES INDEX
  // ═══════════════════════════════════════════════════════

  /**
   * Knowledge file کا index add کریں
   * (صرف metadata، پورا content نہیں — tokens بچانے کے لیے)
   */
  addKnowledgeFile(fileName, summary, keyPoints = []) {
    const existing = this.data.knowledgeIndex.find(
      (k) => k.name === fileName
    );
    if (existing) {
      existing.summary = summary;
      existing.keyPoints = keyPoints;
      existing.updatedAt = new Date().toISOString();
    } else {
      this.data.knowledgeIndex.push({
        name: fileName,
        summary,
        keyPoints,
        addedAt: new Date().toISOString(),
      });
    }
    this.save();
    return this.data.knowledgeIndex;
  }

  removeKnowledgeFile(fileName) {
    this.data.knowledgeIndex = this.data.knowledgeIndex.filter(
      (k) => k.name !== fileName
    );
    this.save();
    return this.data.knowledgeIndex;
  }

  getKnowledgeIndex() {
    return this.data.knowledgeIndex;
  }

  // ═══════════════════════════════════════════════════════
  // 🆕 TOKEN-EFFICIENT MEMORY STRING
  // ═══════════════════════════════════════════════════════

  /**
   * مختصر memory string — model کو بھیجنے کے لیے
   * (پرانے طریقے سے بہت tokens بچائے گا)
   */
  getCompactMemoryString() {
    const lines = [];

    // Preferences — صرف آخری 5
    if (this.data.preferences.length > 0) {
      lines.push("USER PREFERENCES:");
      const recent = this.data.preferences.slice(-5);
      recent.forEach((p) => lines.push(`- ${p}`));
      if (this.data.preferences.length > 5) {
        lines.push(`  (...and ${this.data.preferences.length - 5} more)`);
      }
    }

    // Project Decisions — صرف آخری 5
    if (this.data.projectDecisions.length > 0) {
      lines.push("");
      lines.push("PROJECT DECISIONS:");
      const recent = this.data.projectDecisions.slice(-5);
      recent.forEach((d) => lines.push(`- ${d}`));
    }

    // Completed Tasks — صرف آخری 10
    if (this.data.completedTasks.length > 0) {
      lines.push("");
      lines.push("COMPLETED TASKS:");
      const recent = this.data.completedTasks.slice(-10);
      recent.forEach((t) => lines.push(`- ${t}`));
    }

    // Active Plan — summary only
    if (this.data.activePlan) {
      const summary = this.getPlanSummary();
      lines.push("");
      lines.push("ACTIVE PLAN:");
      lines.push(`Task: ${summary.taskDescription}`);
      lines.push(
        `Progress: ${summary.completed}/${summary.totalSteps} steps (${summary.percentComplete}%)`
      );
      if (summary.nextStep) {
        lines.push(`Next: Step ${summary.nextStep.id} - ${summary.nextStep.description}`);
      }
    }

    // Knowledge Index — names only
    if (this.data.knowledgeIndex.length > 0) {
      lines.push("");
      lines.push("KNOWLEDGE FILES:");
      this.data.knowledgeIndex.forEach((k) => {
        lines.push(`- ${k.name}: ${k.summary}`);
      });
    }

    // Notes — صرف آخری 5
    if (this.data.notes.length > 0) {
      lines.push("");
      lines.push("NOTES:");
      const recent = this.data.notes.slice(-5);
      recent.forEach((n) => lines.push(`- ${n}`));
    }

    return lines.length > 0 ? lines.join("\n") : "No memory yet.";
  }

  /**
   * پوری memory string (backward compatibility)
   */
  getMemoryString() {
    const lines = [];

    if (this.data.preferences.length > 0) {
      lines.push("USER PREFERENCES:");
      this.data.preferences.forEach((p) => lines.push(`- ${p}`));
    }

    if (this.data.projectDecisions.length > 0) {
      lines.push("");
      lines.push("PROJECT DECISIONS:");
      this.data.projectDecisions.forEach((d) => lines.push(`- ${d}`));
    }

    if (this.data.completedTasks.length > 0) {
      lines.push("");
      lines.push("COMPLETED TASKS:");
      this.data.completedTasks.forEach((t) => lines.push(`- ${t}`));
    }

    if (this.data.notes.length > 0) {
      lines.push("");
      lines.push("NOTES:");
      this.data.notes.forEach((n) => lines.push(`- ${n}`));
    }

    // Active Plan
    if (this.data.activePlan) {
      const summary = this.getPlanSummary();
      lines.push("");
      lines.push("ACTIVE PLAN:");
      lines.push(`Task: ${summary.taskDescription}`);
      lines.push(`Total Steps: ${summary.totalSteps}`);
      lines.push(`Completed: ${summary.completed}`);
      lines.push(`Pending: ${summary.pending}`);
      lines.push("");
      lines.push("ALL STEPS:");
      this.data.activePlan.steps.forEach((s) => {
        const icon =
          s.status === "done" ? "✅" :
          s.status === "in-progress" ? "🔄" :
          s.status === "skipped" ? "⏭️" : "⬜";
        lines.push(`${icon} Step ${s.id}: ${s.description} [${s.status}]`);
      });
    }

    // Knowledge Index
    if (this.data.knowledgeIndex.length > 0) {
      lines.push("");
      lines.push("KNOWLEDGE FILES:");
      this.data.knowledgeIndex.forEach((k) => {
        lines.push(`- ${k.name}: ${k.summary}`);
        if (k.keyPoints.length > 0) {
          k.keyPoints.forEach((kp) => lines.push(`  • ${kp}`));
        }
      });
    }

    return lines.length > 0 ? lines.join("\n") : "No memory yet.";
  }

  // ─── Utility Methods ─────────────────────────────────
  getAll() {
    return this.data;
  }

  clearAll() {
    this.data = {
      preferences: [],
      projectDecisions: [],
      completedTasks: [],
      notes: [],
      activePlan: null,
      knowledgeIndex: [],
    };
    this.save();
    return "✅ Memory cleared";
  }

  // ✅ Write queue کا انتظار کریں (tests کے لیے)
  async waitForSave() {
    await this.writeQueue;
  }
}

module.exports = Memory;

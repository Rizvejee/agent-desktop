const fs = require("fs");
const path = require("path");

class Memory {
  constructor(memoryPath) {
    this.memoryPath = memoryPath;
    this.memoryFile = path.join(memoryPath, "agent-memory.json");
    this.data = this.load();
  }

  // memory file پڑھیں
  load() {
    if (!fs.existsSync(this.memoryFile)) {
      return {
        preferences: [],
        projectDecisions: [],
        completedTasks: [],
        notes: [],
      };
    }

    try {
      const content = fs.readFileSync(this.memoryFile, "utf-8");
      return JSON.parse(content);
    } catch {
      return {
        preferences: [],
        projectDecisions: [],
        completedTasks: [],
        notes: [],
      };
    }
  }

  // memory file میں save کریں
  save() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }
    fs.writeFileSync(
      this.memoryFile,
      JSON.stringify(this.data, null, 2),
      "utf-8"
    );
  }

  // کوئی بھی چیز یاد رکھیں
  remember(category, item) {
    if (!this.data[category]) {
      this.data[category] = [];
    }

    // duplicate check
    if (!this.data[category].includes(item)) {
      this.data[category].push(item);
      this.save();
      return `✅ Remembered: ${item}`;
    }

    return `Already remembered: ${item}`;
  }

  // کوئی چیز بھول جائیں
  forget(category, item) {
    if (!this.data[category]) {
      return `Nothing to forget in: ${category}`;
    }

    this.data[category] = this.data[category].filter((i) => i !== item);
    this.save();
    return `✅ Forgotten: ${item}`;
  }

  // پوری memory بطور string حاصل کریں
  getMemoryString() {
    const lines = [];

    if (this.data.preferences.length > 0) {
      lines.push("USER PREFERENCES:");
      this.data.preferences.forEach((p) => lines.push(`- ${p}`));
    }

    if (this.data.projectDecisions.length > 0) {
      lines.push("\nPROJECT DECISIONS:");
      this.data.projectDecisions.forEach((d) => lines.push(`- ${d}`));
    }

    if (this.data.completedTasks.length > 0) {
      lines.push("\nCOMPLETED TASKS:");
      this.data.completedTasks.forEach((t) => lines.push(`- ${t}`));
    }

    if (this.data.notes.length > 0) {
      lines.push("\nNOTES:");
      this.data.notes.forEach((n) => lines.push(`- ${n}`));
    }

    return lines.length > 0 ? lines.join("\n") : "No memory yet.";
  }

  // سب memory دکھائیں
  getAll() {
    return this.data;
  }

  // سب memory صاف کریں
  clearAll() {
    this.data = {
      preferences: [],
      projectDecisions: [],
      completedTasks: [],
      notes: [],
    };
    this.save();
    return "✅ Memory cleared";
  }
}

module.exports = Memory;
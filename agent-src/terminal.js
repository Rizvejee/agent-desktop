const { exec } = require("child_process");
const path = require("path");

class Terminal {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  // command allowed ہے یا نہیں
  isAllowed(command) {
    return this.allowedCommands.some((allowed) =>
      command.trim().startsWith(allowed)
    );
  }

  // command چلائیں
  run(command) {
    return new Promise((resolve) => {
      console.log(`\n⚡ Running: ${command}\n`);
      exec(command, { cwd: this.projectPath, timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, output: stderr || error.message });
          return;
        }
        resolve({ success: true, output: stdout || "✅ Command completed successfully" });
      });
    });
  }
}

module.exports = Terminal;

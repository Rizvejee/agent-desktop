const { exec } = require("child_process");
const path = require("path");

class Terminal {
  constructor(projectPath) {
    this.projectPath = projectPath;

    // صرف یہ commands allowed ہیں
    this.allowedCommands = [
      "npm install",
      "npm run dev",
      "npm run build",
      "npm run start",
      "npm test",
      "npm run lint",
      "npx expo start",
      "npx expo build",
      "node",
      "ls",
      "pwd",
    ];
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
      // security check
      if (!this.isAllowed(command)) {
        resolve({
          success: false,
          output: `❌ Command not allowed: "${command}"\nAllowed commands: ${this.allowedCommands.join(", ")}`,
        });
        return;
      }

      console.log(`\n⚡ Running: ${command}\n`);

      exec(
        command,
        {
          cwd: this.projectPath,
          timeout: 30000, // 30 seconds timeout
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              output: stderr || error.message,
            });
            return;
          }

          resolve({
            success: true,
            output: stdout || "✅ Command completed successfully",
          });
        }
      );
    });
  }
}

module.exports = Terminal;
const { exec } = require("child_process");
const path = require("path");

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const COMMAND_TIMEOUT = 120000; // 2 minutes — بڑے commands کے لیے
const MAX_OUTPUT_SIZE = 50000;  // 50KB — بڑا output truncate ہوگا

// ✅ Allowed commands — صرف یہی چلیں گے
const ALLOWED_COMMANDS = [
  // Package managers
  "npm", "yarn", "pnpm", "bun",
  // Node
  "node", "npx",
  // File inspection (safe)
  "ls", "dir", "cat", "type", "head", "tail", "wc",
  "pwd", "echo", "which", "where",
  // Git (read-only mostly)
  "git",
  // Build tools
  "vite", "webpack", "tsc", "babel",
  // Testing
  "jest", "vitest", "mocha",
  // Linters
  "eslint", "prettier",
  // Mobile
  "expo", "react-native",
  // Python (agar zaroorat ho)
  "python", "pip",
];

// ❌ Dangerous patterns — یہ کبھی allow نہیں ہوں گے
const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\s+\//,           // rm -rf /
  /\bformat\s+[a-zA-Z]:/i,     // format C:
  /\bdel\s+\/[fqs]/i,          // del /f /q /s
  /\bmkfs\b/,                   // mkfs
  /\bdd\s+if=/,                 // dd
  /\b:\(\)\s*\{/,              // fork bomb
  /\bshutdown\b/,              // shutdown
  /\breboot\b/,                // reboot
  /\bsudo\b/,                  // sudo
  /\bchmod\s+777\b/,           // chmod 777
  /\bchown\b/,                 // chown
  /\bcurl.*\|\s*(bash|sh)\b/i, // curl | bash
  /\bwget.*\|\s*(bash|sh)\b/i, // wget | bash
  /&&\s*(rm|del|format)/i,     // && rm
  /\|\s*(rm|del|format)/i,     // | rm
  />\s*\/(etc|dev|proc)/i,     // > /etc/...
  /\bnet\s+user\b/i,           // net user
  /\breg\s+(add|delete)\b/i,   // reg add/delete
];

class Terminal {
  constructor(projectPath) {
    this.projectPath = path.resolve(projectPath);
    this.allowedCommands = ALLOWED_COMMANDS; // ✅ اب defined ہے!
  }

  // ═══════════════════════════════════════════════════════
  // 🔒 SECURITY: Command Validation
  // ═══════════════════════════════════════════════════════

  /**
   * Check کریں کہ command allowed ہے یا نہیں
   */
  isAllowed(command) {
    if (!command || typeof command !== "string") {
      return { allowed: false, reason: "Empty command" };
    }

    const trimmed = command.trim();
    if (trimmed.length === 0) {
      return { allowed: false, reason: "Empty command" };
    }

    // ✅ Dangerous patterns check
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          reason: `Dangerous pattern detected: ${pattern}`
        };
      }
    }

    // ✅ Path traversal check
    if (trimmed.includes("..") &&
        (trimmed.includes("/") || trimmed.includes("\\"))) {
      // Allow `cd ..` but not `../../etc/passwd`
      if (/\.\.\/\.\./.test(trimmed) || /\.\.\\\.\./.test(trimmed)) {
        return { allowed: false, reason: "Path traversal detected" };
      }
    }

    // ✅ First word check — command کا پہلا حصہ allowed list میں ہو
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();

    // Handle: ./script.js, npm run, etc.
    const baseCommand = firstWord.replace(/^\.\/|^\.\//, "");

    if (this.allowedCommands.includes(baseCommand)) {
      return { allowed: true };
    }

    // Special case: if command starts with allowed command + args
    // e.g., "npm install" → "npm" is allowed
    for (const allowed of this.allowedCommands) {
      if (trimmed.startsWith(allowed + " ") || trimmed === allowed) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: `Command "${firstWord}" is not in the allowed list`
    };
  }

  // ═══════════════════════════════════════════════════════
  // ⚡ RUN COMMAND
  // ═══════════════════════════════════════════════════════
  run(command) {
    return new Promise((resolve) => {
      // ✅ Security check پہلے
      const validation = this.isAllowed(command);
      if (!validation.allowed) {
        resolve({
          success: false,
          output: `❌ Command not allowed: ${command}\n` +
                  `Reason: ${validation.reason}\n\n` +
                  `Allowed commands: ${this.allowedCommands.join(", ")}`,
        });
        return;
      }

      console.log(`\n⚡ Running: ${command}`);
      console.log(`📁 Working directory: ${this.projectPath}`);

      const startTime = Date.now();

      exec(
        command,
        {
          cwd: this.projectPath,
          timeout: COMMAND_TIMEOUT,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
          env: {
            ...process.env,
            // ✅ Color output disable کریں (cleaner output)
            NO_COLOR: "1",
            FORCE_COLOR: "0",
          },
        },
        (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          console.log(`⏱️  Completed in ${duration}ms`);

          let output = "";

          if (error) {
            // ✅ Timeout handling
            if (error.killed) {
              output = `❌ Command timed out after ${COMMAND_TIMEOUT / 1000} seconds.\n` +
                       `Try a simpler command or break it into smaller steps.`;
            } else {
              // ✅ stderr ہو تو وہ دکھائیں
              output = stderr || error.message || "Command failed";
            }

            // ✅ stdout بھی add کریں اگر ہو (partial output)
            if (stdout && stdout.trim()) {
              output += `\n\n--- Partial Output ---\n${stdout}`;
            }

            resolve({
              success: false,
              output: this.truncateOutput(output),
              duration,
            });
            return;
          }

          // ✅ Success
          output = stdout || "✅ Command completed successfully";

          // ✅ stderr میں warnings ہو تو add کریں
          if (stderr && stderr.trim()) {
            output += `\n\n--- Warnings ---\n${stderr}`;
          }

          resolve({
            success: true,
            output: this.truncateOutput(output),
            duration,
          });
        }
      );
    });
  }

  // ═══════════════════════════════════════════════════════
  // 📏 OUTPUT TRUNCATION
  // ═══════════════════════════════════════════════════════
  truncateOutput(output) {
    if (!output || output.length <= MAX_OUTPUT_SIZE) {
      return output;
    }

    const half = Math.floor(MAX_OUTPUT_SIZE / 2);
    const truncated = output.length - MAX_OUTPUT_SIZE;

    return (
      output.slice(0, half) +
      `\n\n... [${truncated} characters truncated to save tokens] ...\n\n` +
      output.slice(-half)
    );
  }

  // ═══════════════════════════════════════════════════════
  // 🛠️ UTILITY METHODS
  // ═══════════════════════════════════════════════════════

  /**
   * Allowed commands کی list حاصل کریں
   */
  getAllowedCommands() {
    return [...this.allowedCommands];
  }

  /**
   * نیا command allowed list میں add کریں
   */
  addAllowedCommand(command) {
    if (!this.allowedCommands.includes(command)) {
      this.allowedCommands.push(command);
      return true;
    }
    return false;
  }
}

module.exports = Terminal;

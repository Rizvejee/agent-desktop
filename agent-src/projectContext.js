const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const MAX_DEPTH = 3;              // Directory tree کی زیادہ سے زیادہ depth
const MAX_ITEMS_PER_DIR = 50;     // ایک directory میں زیادہ سے زیادہ items
const MAX_FILE_READ_SIZE = 10000; // 10KB — context میں شامل files کی حد
const MAX_CONTEXT_LENGTH = 15000; // پورے context کی زیادہ سے زیادہ لمبائی

// وہ folders جو ہمیشہ ignore ہوں گے
const IGNORED_DIRS = [
  "node_modules", ".git", ".next", "dist", "build",
  ".expo", ".cache", ".vite", "coverage", ".idea",
  ".vscode", "__tests__", "__pycache__", ".turbo",
  "android", "ios", ".gradle",
];

// Project type کے حساب سے important files
const IMPORTANT_FILES_BY_TYPE = {
  react: [
    "package.json",
    "src/App.jsx", "src/App.js", "src/App.tsx",
    "src/main.jsx", "src/main.js", "src/index.jsx", "src/index.js",
    "vite.config.js", "vite.config.ts",
    "index.html",
  ],
  nextjs: [
    "package.json",
    "next.config.js", "next.config.mjs",
    "app/layout.jsx", "app/layout.js", "app/layout.tsx",
    "app/page.jsx", "app/page.js", "app/page.tsx",
    "src/app/layout.jsx", "src/app/page.jsx",
  ],
  expo: [
    "package.json",
    "app.json", "app.config.js",
    "App.js", "App.jsx", "App.tsx",
    "app/index.jsx", "app/index.js",
    "app/_layout.jsx", "app/_layout.js",
  ],
  nodejs: [
    "package.json",
    "index.js", "server.js", "app.js",
    "src/index.js", "src/app.js",
  ],
  default: [
    "package.json",
    "README.md",
    "index.html",
  ],
};

class ProjectContext {
  constructor(projectPath) {
    this.projectPath = path.resolve(projectPath);
    this.context = null; // Cache
  }

  // ═══════════════════════════════════════════════════════
  // 🎯 MAIN: Get Full Context String
  // ═══════════════════════════════════════════════════════
  getContextString() {
    if (this.context) return this.context;

    try {
      const parts = [];

      // 1. Project type detect کریں
      const projectType = this.detectProjectType();
      parts.push(`Project Type: ${projectType}`);
      parts.push(`Project Path: ${this.projectPath}`);
      parts.push("");

      // 2. Directory structure
      parts.push("DIRECTORY STRUCTURE:");
      const structure = this.getStructure();
      parts.push(structure);
      parts.push("");

      // 3. Important files content
      parts.push("KEY FILES:");
      const keyFiles = this.readImportantFiles(projectType);
      parts.push(keyFiles);

      // 4. Truncate if too long
      let fullContext = parts.join("\n");
      if (fullContext.length > MAX_CONTEXT_LENGTH) {
        fullContext = fullContext.slice(0, MAX_CONTEXT_LENGTH) +
          `\n\n... [context truncated at ${MAX_CONTEXT_LENGTH} chars to save tokens] ...`;
      }

      this.context = fullContext;
      return this.context;
    } catch (error) {
      return `Error building project context: ${error.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 🔍 DETECT PROJECT TYPE
  // ═══════════════════════════════════════════════════════
  detectProjectType() {
    const pkgPath = path.join(this.projectPath, "package.json");

    if (!fs.existsSync(pkgPath)) return "unknown";

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      if (allDeps["expo"]) return "expo";
      if (allDeps["next"]) return "nextjs";
      if (allDeps["react"] && (allDeps["vite"] || allDeps["react-scripts"])) return "react";
      if (allDeps["react-native"]) return "react-native";
      if (allDeps["express"] || allDeps["fastify"] || allDeps["koa"]) return "nodejs";
      if (allDeps["react"]) return "react";

      return "nodejs";
    } catch {
      return "unknown";
    }
  }

  // ═══════════════════════════════════════════════════════
  // 📁 GET DIRECTORY STRUCTURE (Token-efficient)
  // ═══════════════════════════════════════════════════════
  getStructure(dirPath = this.projectPath, depth = 0) {
    if (depth > MAX_DEPTH) return "";

    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const lines = [];
      let itemCount = 0;

      // Sort: folders first, then files, alphabetically
      const sorted = items
        .filter((item) => {
          if (item.name.startsWith(".")) return false;
          if (item.isDirectory() && IGNORED_DIRS.includes(item.name)) return false;
          return true;
        })
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });

      for (const item of sorted) {
        if (itemCount >= MAX_ITEMS_PER_DIR) {
          const indent = "  ".repeat(depth);
          lines.push(`${indent}... (${sorted.length - itemCount} more items)`);
          break;
        }

        itemCount++;
        const indent = "  ".repeat(depth);

        if (item.isDirectory()) {
          // ✅ Plain text — emoji نہیں
          lines.push(`${indent}[DIR] ${item.name}/`);
          const subStructure = this.getStructure(
            path.join(dirPath, item.name),
            depth + 1
          );
          if (subStructure) {
            lines.push(subStructure);
          }
        } else {
          lines.push(`${indent}[FILE] ${item.name}`);
        }
      }

      return lines.join("\n");
    } catch {
      return "";
    }
  }

  // ═══════════════════════════════════════════════════════
  // 📖 READ IMPORTANT FILES (Token-efficient)
  // ═══════════════════════════════════════════════════════
  readImportantFiles(projectType) {
    const filesToRead = IMPORTANT_FILES_BY_TYPE[projectType] ||
                        IMPORTANT_FILES_BY_TYPE.default;
    const results = [];
    let totalLength = 0;

    for (const filePath of filesToRead) {
      // ✅ Budget check — context بہت لمبا نہ ہو
      if (totalLength >= MAX_CONTEXT_LENGTH / 2) {
        results.push(`\n... [remaining files skipped to save tokens] ...`);
        break;
      }

      const fullPath = path.join(this.projectPath, filePath);

      if (!fs.existsSync(fullPath)) continue;

      try {
        const stat = fs.statSync(fullPath);

        // Skip directories
        if (stat.isDirectory()) continue;

        // Skip large files
        if (stat.size > MAX_FILE_READ_SIZE) {
          results.push(`\n--- ${filePath} (${(stat.size / 1024).toFixed(1)}KB - too large, showing first 200 lines) ---`);
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n").slice(0, 200);
          const truncated = lines.join("\n");
          results.push(truncated);
          totalLength += truncated.length;
          continue;
        }

        // Skip binary files
        const ext = path.extname(filePath).toLowerCase();
        const binaryExts = [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".ico", ".woff", ".woff2"];
        if (binaryExts.includes(ext)) continue;

        const content = fs.readFileSync(fullPath, "utf-8");
        results.push(`\n--- ${filePath} ---`);
        results.push(content);
        totalLength += content.length;
      } catch {
        // Skip unreadable files
        continue;
      }
    }

    return results.length > 0 ? results.join("\n") : "(no key files found)";
  }

  // ═══════════════════════════════════════════════════════
  // 🔄 REFRESH (Cache clear)
  // ═══════════════════════════════════════════════════════
  refresh() {
    this.context = null;
    return this.getContextString();
  }

  // ═══════════════════════════════════════════════════════
  // 📊 GET PROJECT INFO (Summary only — very token-efficient)
  // ═══════════════════════════════════════════════════════
  getProjectSummary() {
    const projectType = this.detectProjectType();
    const pkgPath = path.join(this.projectPath, "package.json");

    let name = "Unknown Project";
    let deps = [];

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        name = pkg.name || name;
        deps = Object.keys(pkg.dependencies || {});
      } catch {}
    }

    // Count files (quick estimate)
    let fileCount = 0;
    try {
      const countFiles = (dir, depth = 0) => {
        if (depth > 2) return;
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name.startsWith(".") || IGNORED_DIRS.includes(item.name)) continue;
          if (item.isFile()) fileCount++;
          else if (item.isDirectory()) countFiles(path.join(dir, item.name), depth + 1);
        }
      };
      countFiles(this.projectPath);
    } catch {}

    return {
      name,
      type: projectType,
      path: this.projectPath,
      fileCount,
      dependencies: deps.slice(0, 15), // Top 15 only
    };
  }
}

module.exports = ProjectContext;

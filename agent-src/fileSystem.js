const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — بڑی files reject ہوں گی
const MAX_LIST_ITEMS = 500;            // ایک directory میں زیادہ سے زیادہ items

// Binary file extensions — یہ پڑھی نہیں جا سکتیں
const BINARY_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
  ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".woff", ".woff2", ".ttf", ".eot",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".db", ".sqlite", ".sqlite3",
];

class FileSystem {
  constructor(projectPath) {
    this.projectPath = path.resolve(projectPath);
  }

  // ═══════════════════════════════════════════════════════
  // 🔒 SECURITY: Path Validation
  // ═══════════════════════════════════════════════════════

  /**
   * Path کو validate کریں — project directory سے باہر نہ جائے
   * Path Traversal attack روکنے کے لیے
   */
  validatePath(filePath) {
    if (!filePath || typeof filePath !== "string") {
      throw new Error("Invalid file path");
    }

    const targetPath = path.resolve(this.projectPath, filePath);
    const normalizedProject = path.resolve(this.projectPath);

    // ✅ Check: path project کے اندر ہے؟
    if (
      targetPath !== normalizedProject &&
      !targetPath.startsWith(normalizedProject + path.sep)
    ) {
      throw new Error(
        `Access denied: path "${filePath}" is outside project directory`
      );
    }

    return targetPath;
  }

  /**
   * Check کریں کہ file binary تو نہیں
   */
  isBinaryFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
  }

  // ═══════════════════════════════════════════════════════
  // 📁 LIST FILES
  // ═══════════════════════════════════════════════════════
  listFiles(subPath = "") {
    try {
      const targetPath = this.validatePath(subPath);

      if (!fs.existsSync(targetPath)) {
        return `Error: Path does not exist: ${subPath}`;
      }

      const stat = fs.statSync(targetPath);
      if (!stat.isDirectory()) {
        return `Error: Not a directory: ${subPath}`;
      }

      const items = fs.readdirSync(targetPath, { withFileTypes: true });

      // ✅ Ignored folders
      const ignored = [
        "node_modules", ".git", ".next", "dist", "build",
        ".expo", ".cache", ".vite", "coverage", ".idea", ".vscode",
      ];

      const result = items
        .filter((item) => {
          if (item.name.startsWith(".")) return false;
          if (item.isDirectory() && ignored.includes(item.name)) return false;
          return true;
        })
        .slice(0, MAX_LIST_ITEMS) // ✅ Limit items
        .map((item) => {
          // ✅ Plain text — emoji کی جگہ
          const type = item.isDirectory() ? "[DIR] " : "[FILE] ";
          return `${type}${item.name}`;
        });

      if (items.length > MAX_LIST_ITEMS) {
        result.push(`... and ${items.length - MAX_LIST_ITEMS} more (truncated)`);
      }

      return result.length > 0 ? result.join("\n") : "(empty directory)";
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 📖 READ FILE
  // ═══════════════════════════════════════════════════════
  readFile(filePath) {
    try {
      const targetPath = this.validatePath(filePath);

      if (!fs.existsSync(targetPath)) {
        return `Error: File does not exist: ${filePath}`;
      }

      const stat = fs.statSync(targetPath);

      // ✅ Directory check
      if (stat.isDirectory()) {
        return `Error: "${filePath}" is a directory, not a file`;
      }

      // ✅ Size check
      if (stat.size > MAX_FILE_SIZE) {
        return `Error: File too large (${(stat.size / 1024 / 1024).toFixed(2)}MB). Maximum is 5MB.`;
      }

      // ✅ Binary file check
      if (this.isBinaryFile(filePath)) {
        return `Error: Cannot read binary file: ${filePath}`;
      }

      return fs.readFileSync(targetPath, "utf-8");
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✍️ WRITE FILE
  // ═══════════════════════════════════════════════════════
  writeFile(filePath, content) {
    try {
      const targetPath = this.validatePath(filePath);

      // ✅ Content validation
      if (typeof content !== "string") {
        return `Error: Content must be a string`;
      }

      // ✅ Size check
      if (content.length > MAX_FILE_SIZE) {
        return `Error: Content too large (${(content.length / 1024 / 1024).toFixed(2)}MB). Maximum is 5MB.`;
      }

      // ✅ Folder نہ ہو تو بنائیں
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(targetPath, content, "utf-8");
      return `✅ File written successfully: ${filePath}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 📝 CREATE FILE
  // ═══════════════════════════════════════════════════════
  createFile(filePath, content = "") {
    try {
      const targetPath = this.validatePath(filePath);

      if (fs.existsSync(targetPath)) {
        return `Error: File already exists: ${filePath}. Use write_file to update.`;
      }

      // ✅ Content validation
      if (typeof content !== "string") {
        return `Error: Content must be a string`;
      }

      // ✅ Folder نہ ہو تو بنائیں
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(targetPath, content, "utf-8");
      return `✅ File created successfully: ${filePath}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 🗑️ DELETE FILE
  // ═══════════════════════════════════════════════════════
  deleteFile(filePath) {
    try {
      const targetPath = this.validatePath(filePath);

      if (!fs.existsSync(targetPath)) {
        return `Error: File does not exist: ${filePath}`;
      }

      // ✅ Safety: node_modules یا project root delete نہ ہو
      const relativePath = path.relative(this.projectPath, targetPath);
      if (
        relativePath === "" ||
        relativePath === "node_modules" ||
        relativePath.startsWith("node_modules" + path.sep)
      ) {
        return `Error: Cannot delete critical path: ${filePath}`;
      }

      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        return `Error: "${filePath}" is a directory. Use with caution.`;
      }

      fs.unlinkSync(targetPath);
      return `✅ File deleted successfully: ${filePath}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 🔍 SEARCH FILES
  // ═══════════════════════════════════════════════════════
  searchFiles(searchTerm, subPath = "") {
    try {
      if (!searchTerm || typeof searchTerm !== "string") {
        return `Error: Search term is required`;
      }

      const targetPath = this.validatePath(subPath);

      if (!fs.existsSync(targetPath)) {
        return `Error: Path does not exist: ${subPath}`;
      }

      const results = [];
      const MAX_RESULTS = 100; // ✅ Limit results

      const ignored = [
        "node_modules", ".git", ".next", "dist", "build",
        ".expo", ".cache", ".vite", "coverage",
      ];

      const search = (dirPath, depth = 0) => {
        if (results.length >= MAX_RESULTS) return;
        if (depth > 5) return; // ✅ Max depth

        let items;
        try {
          items = fs.readdirSync(dirPath, { withFileTypes: true });
        } catch {
          return;
        }

        for (const item of items) {
          if (results.length >= MAX_RESULTS) break;
          if (item.name.startsWith(".")) continue;
          if (item.isDirectory() && ignored.includes(item.name)) continue;

          const fullPath = path.join(dirPath, item.name);

          if (item.isDirectory()) {
            if (item.name.includes(searchTerm)) {
              const relativePath = path.relative(this.projectPath, fullPath);
              results.push(`[DIR]  ${relativePath}`);
            }
            search(fullPath, depth + 1);
          } else if (item.name.includes(searchTerm)) {
            const relativePath = path.relative(this.projectPath, fullPath);
            results.push(`[FILE] ${relativePath}`);
          }
        }
      };

      search(targetPath);

      if (results.length === 0) {
        return `No files found matching: "${searchTerm}"`;
      }

      let output = `Found ${results.length} result(s):\n` + results.join("\n");
      if (results.length >= MAX_RESULTS) {
        output += `\n... (showing first ${MAX_RESULTS} results)`;
      }
      return output;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 📊 FILE INFO (نیا — Agent کے لیے مفید)
  // ═══════════════════════════════════════════════════════
  getFileInfo(filePath) {
    try {
      const targetPath = this.validatePath(filePath);

      if (!fs.existsSync(targetPath)) {
        return `Error: File does not exist: ${filePath}`;
      }

      const stat = fs.statSync(targetPath);
      const ext = path.extname(filePath).toLowerCase();

      return {
        path: filePath,
        name: path.basename(filePath),
        extension: ext,
        size: stat.size,
        sizeReadable: this.formatSize(stat.size),
        isDirectory: stat.isDirectory(),
        isBinary: this.isBinaryFile(filePath),
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}

module.exports = FileSystem;

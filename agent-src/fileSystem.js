const fs = require("fs");
const path = require("path");

class FileSystem {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  // سب files کی list دکھائیں
  listFiles(subPath = "") {
    const targetPath = path.join(this.projectPath, subPath);
    
    if (!fs.existsSync(targetPath)) {
      return `Error: Path does not exist: ${targetPath}`;
    }

    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    
    const result = items
      .filter(item => !item.name.startsWith(".") && item.name !== "node_modules")
      .map(item => {
        const type = item.isDirectory() ? "📁" : "📄";
        return `${type} ${item.name}`;
      });

    return result.join("\n");
  }

  // file پڑھیں
  readFile(filePath) {
    const targetPath = path.join(this.projectPath, filePath);
    
    if (!fs.existsSync(targetPath)) {
      return `Error: File does not exist: ${filePath}`;
    }

    return fs.readFileSync(targetPath, "utf-8");
  }

  // file لکھیں
  writeFile(filePath, content) {
  const targetPath = path.join(this.projectPath, filePath);
  
  // folder نہ ہو تو پہلے بنائیں
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(targetPath, content, "utf-8");
  return `✅ File written successfully: ${filePath}`;
}

  // نئی file بنائیں
  createFile(filePath, content = "") {
    const targetPath = path.join(this.projectPath, filePath);
    
    if (fs.existsSync(targetPath)) {
      return `Error: File already exists: ${filePath}`;
    }

    // folder نہ ہو تو بنائیں
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, content, "utf-8");
    return `✅ File created successfully: ${filePath}`;
  }

  // file delete کریں
  deleteFile(filePath) {
    const targetPath = path.join(this.projectPath, filePath);
    
    if (!fs.existsSync(targetPath)) {
      return `Error: File does not exist: ${filePath}`;
    }

    fs.unlinkSync(targetPath);
    return `✅ File deleted successfully: ${filePath}`;
  }

  // file تلاش کریں
  searchFiles(searchTerm, subPath = "") {
    const targetPath = path.join(this.projectPath, subPath);
    const results = [];

    const search = (dirPath) => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          search(fullPath);
        } else if (item.name.includes(searchTerm)) {
          const relativePath = fullPath.replace(this.projectPath, "");
          results.push(relativePath);
        }
      }
    };

    search(targetPath);
    
    if (results.length === 0) {
      return `No files found with: ${searchTerm}`;
    }

    return results.join("\n");
  }
}

module.exports = FileSystem;
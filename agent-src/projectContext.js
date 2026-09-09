const fs = require("fs");
const path = require("path");

class ProjectContext {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.context = null;
  }

  // project کی type detect کریں
  detectProjectType() {
    const packageJsonPath = path.join(this.projectPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return "unknown";
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8")
    );

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (deps["expo"]) return "expo";
    if (deps["next"]) return "nextjs";
    if (deps["react-native"]) return "react-native";
    if (deps["react"]) return "react";

    return "nodejs";
  }

  // project کا basic structure حاصل کریں
  getStructure(dirPath = this.projectPath, depth = 0) {
    if (depth > 2) return [];

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = [];

    const ignored = [
      "node_modules",
      ".git",
      ".next",
      "build",
      "dist",
      ".expo",
    ];

    for (const item of items) {
      if (item.name.startsWith(".")) continue;
      if (ignored.includes(item.name)) continue;

      const fullPath = path.join(dirPath, item.name);
      const relativePath = fullPath.replace(this.projectPath + "/", "");

      if (item.isDirectory()) {
        result.push(`📁 ${relativePath}/`);
        const children = this.getStructure(fullPath, depth + 1);
        result.push(...children);
      } else {
        result.push(`📄 ${relativePath}`);
      }
    }

    return result;
  }

  // package.json سے اہم معلومات نکالیں
  getPackageInfo() {
    const packageJsonPath = path.join(this.projectPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8")
    );

    return {
      name: packageJson.name,
      version: packageJson.version,
      scripts: packageJson.scripts,
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
    };
  }

  // کسی file کا content پڑھیں
  readFile(filePath) {
    const fullPath = path.join(this.projectPath, filePath);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return fs.readFileSync(fullPath, "utf-8");
  }

  // پورا context تیار کریں
  buildContext() {
    const projectType = this.detectProjectType();
    const structure = this.getStructure();
    const packageInfo = this.getPackageInfo();

    // اہم files پڑھیں
    const importantFiles = {};
    const filesToRead = [
      "src/App.js",
      "src/App.jsx",
      "app/page.js",
      "app/page.jsx",
      "App.js",
      "App.jsx",
    ];

    for (const file of filesToRead) {
      const content = this.readFile(file);
      if (content) {
        importantFiles[file] = content;
      }
    }

    this.context = {
      projectType,
      packageInfo,
      structure: structure.join("\n"),
      importantFiles,
    };

    return this.context;
  }

  // context کو string میں تبدیل کریں Agent کے لیے
  getContextString() {
    if (!this.context) {
      this.buildContext();
    }

    const { projectType, packageInfo, structure, importantFiles } =
      this.context;

    let contextStr = `PROJECT INFORMATION:
Type: ${projectType}
Name: ${packageInfo?.name || "unknown"}

PROJECT STRUCTURE:
${structure}

INSTALLED PACKAGES:
${packageInfo?.dependencies?.join(", ") || "none"}

AVAILABLE SCRIPTS:
${Object.entries(packageInfo?.scripts || {})
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n")}`;

    if (Object.keys(importantFiles).length > 0) {
      contextStr += "\n\nKEY FILES:\n";
      for (const [file, content] of Object.entries(importantFiles)) {
        contextStr += `\n--- ${file} ---\n${content}\n`;
      }
    }

    return contextStr;
  }
}

module.exports = ProjectContext;
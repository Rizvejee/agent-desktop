import { useState, useEffect } from "react";

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const result = await window.electronAPI.getProjects();
      if (result.success && result.projects.length > 0) {
        setProjects(result.projects);
        setActiveProject(result.projects[0]);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }

  async function addProject() {
    try {
      const result = await window.electronAPI.selectFolder();
      if (!result.success) return null;

      const newProject = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: result.name,
        path: result.path,
      };

      const updated = [...projects, newProject];
      setProjects(updated);
      setActiveProject(newProject);

      await window.electronAPI.saveProjects(updated);

      // ✅ FIX: projectId بھی بھیجیں
      await window.electronAPI.resetAgent(newProject.path, newProject.id);

      return newProject;
    } catch (error) {
      console.error("Error adding project:", error);
      return null;
    }
  }

  async function removeProject(projectId) {
    try {
      const updated = projects.filter((p) => p.id !== projectId);
      setProjects(updated);
      await window.electronAPI.saveProjects(updated);

      if (activeProject?.id === projectId) {
        setActiveProject(updated.length > 0 ? updated[0] : null);
      }
    } catch (error) {
      console.error("Error removing project:", error);
    }
  }

  // ✅ FIX: projectId missing تھا
  async function switchProject(project) {
    setActiveProject(project);

    // ✅ FIX: projectId بھی بھیجیں
    await window.electronAPI.resetAgent(project.path, project.id);
  }

  return {
    projects,
    activeProject,
    addProject,
    removeProject,
    switchProject,
  };
}

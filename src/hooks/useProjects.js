import { useState, useEffect } from "react";

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const result = await window.electronAPI.getProjects();
    if (result.success && result.projects.length > 0) {
      setProjects(result.projects);
      setActiveProject(result.projects[0]);
    }
  }

  async function addProject() {
    const result = await window.electronAPI.selectFolder();
    if (!result.success) return;

    const newProject = {
      id: Date.now().toString(36),
      name: result.name,
      path: result.path,
    };

    const updated = [...projects, newProject];
    setProjects(updated);
    setActiveProject(newProject);
    await window.electronAPI.saveProjects(updated);
    await window.electronAPI.resetAgent(newProject.path, newProject.id);

    return newProject;
  }

  async function removeProject(projectId) {
    const updated = projects.filter((p) => p.id !== projectId);
    setProjects(updated);
    await window.electronAPI.saveProjects(updated);

    if (activeProject?.id === projectId) {
      setActiveProject(updated.length > 0 ? updated[0] : null);
    }
  }

  async function switchProject(project) {
    setActiveProject(project);
    await window.electronAPI.resetAgent(project.path);
  }

  return {
    projects,
    activeProject,
    addProject,
    removeProject,
    switchProject,
  };
}
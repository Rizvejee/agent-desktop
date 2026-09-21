import { createContext, useContext, useState, useEffect } from "react";
import { themes } from "./theme";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("light");
  const theme = themes[mode];

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const result = await window.electronAPI.getSettings();
      if (result.success && result.settings.theme) {
        setMode(result.settings.theme);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  }

  // ✅ FIX: جب theme toggle ہو تو اسے save بھی کریں
  async function toggleTheme(newMode) {
    setMode(newMode);

    // نئی settings لوڈ کریں، theme update کریں، اور save کریں
    try {
      const result = await window.electronAPI.getSettings();
      const currentSettings = result.success ? result.settings : {};

      await window.electronAPI.saveSettings({
        ...currentSettings,
        theme: newMode,
      });
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

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
    const result = await window.electronAPI.getSettings();
    if (result.success && result.settings.theme) {
      setMode(result.settings.theme);
    }
  }

  function toggleTheme(newMode) {
    setMode(newMode);
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
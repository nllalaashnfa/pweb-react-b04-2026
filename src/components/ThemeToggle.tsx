import { useEffect } from "react";

import { useLocalStorage } from "../hooks/useLocalStorage";

type Theme = "light" | "dark";

export function ThemeToggle() {
  // Tersimpan di localStorage["theme"] sehingga tetap setelah refresh
  const [theme, setTheme] = useLocalStorage<Theme>("theme", "light");

  // Side effect: pasang atribut ke <html> agar variabel CSS di theme.css berganti
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const nextTheme: Theme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Ganti ke mode ${nextTheme === "dark" ? "gelap" : "terang"}`}
    >
      {theme === "light" ? "🌙 Gelap" : "☀️ Terang"}
    </button>
  );
}

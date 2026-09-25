"use client";

import { useEffect, useState } from "react";

export function ThemePreference({ value }: { value: string }) {
  const normalizedValue = value === "light" ? "light" : "dark";
  const [theme, setTheme] = useState(normalizedValue);

  useEffect(() => {
    document.querySelector<HTMLElement>(".app-theme")?.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <label className="block max-w-md">
      <span className="field-label">Tema da aplicação</span>
      <select
        name="theme"
        value={theme}
        className="input-field mt-1.5"
        onChange={(event) => {
          setTheme(event.currentTarget.value === "dark" ? "dark" : "light");
        }}
      >
        <option value="light">Claro · visual padrão</option>
        <option value="dark">Escuro · melhor para ambientes com pouca luz</option>
      </select>
    </label>
  );
}

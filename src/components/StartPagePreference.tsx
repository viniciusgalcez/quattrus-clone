"use client";

import { useState } from "react";

const START_PAGES = new Set(["/", "/metas", "/farol", "/agenda"]);

export function StartPagePreference({ value }: { value: string }) {
  const normalizedValue = START_PAGES.has(value) ? value : "/";
  const [startPage, setStartPage] = useState(normalizedValue);

  return (
    <label className="block max-w-md">
      <span className="field-label">Página inicial</span>
      <select name="startPage" value={startPage} onChange={(event) => setStartPage(event.currentTarget.value)} className="input-field mt-1.5">
        <option value="/">Painel</option>
        <option value="/metas">Metas e indicadores</option>
        <option value="/farol">Farol</option>
        <option value="/agenda">Agenda</option>
      </select>
      <span className="mt-1.5 block text-[11px] text-[var(--color-ink-500)]">Será aberta na sua próxima entrada no sistema.</span>
    </label>
  );
}

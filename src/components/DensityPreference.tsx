"use client";

import { useEffect, useState } from "react";

export function DensityPreference({ value }: { value: string }) {
  const normalizedValue = value === "compact" ? "compact" : "comfortable";
  const [density, setDensity] = useState(normalizedValue);

  useEffect(() => {
    document.querySelector<HTMLElement>(".app-theme")?.setAttribute("data-density", density);
  }, [density]);

  return (
    <label className="block max-w-md">
      <span className="field-label">Densidade das telas</span>
      <select
        name="density"
        value={density}
        className="input-field mt-1.5"
        onChange={(event) => {
          setDensity(event.currentTarget.value === "compact" ? "compact" : "comfortable");
        }}
      >
        <option value="comfortable">Confortável · mais respiro entre os dados</option>
        <option value="compact">Compacta · mais informações na mesma tela</option>
      </select>
    </label>
  );
}

"use client";

import { useRouter } from "next/navigation";

export function MedicoesKpiSelector({
  year,
  selectedKpiId,
  options,
}: {
  year: number;
  selectedKpiId: string;
  options: { id: string; label: string }[];
}) {
  const router = useRouter();

  return (
    <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
      <span className="field-label">Item de controle</span>
      <select
        className="input-field"
        value={selectedKpiId}
        onChange={(event) => {
          router.push(`/medicoes?ano=${year}&kpi=${event.target.value}`);
        }}
        aria-label="Selecionar item de controle"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

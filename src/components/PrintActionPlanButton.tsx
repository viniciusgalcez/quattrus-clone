"use client";

import { Printer } from "lucide-react";

export function PrintActionPlanButton() {
  return <button type="button" onClick={() => window.print()} className="btn" title="Imprimir plano de ação"><Printer className="h-3.5 w-3.5" /> Imprimir</button>;
}

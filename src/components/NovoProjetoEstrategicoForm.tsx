"use client";

import { useActionState } from "react";
import { createStrategicProject } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FieldError";

type Option = { id: string; name: string };

export function NovoProjetoEstrategicoForm({ departments, kpis }: { departments: Option[]; kpis: Option[] }) {
  const [state, formAction] = useActionState(createStrategicProject, null);
  return <form noValidate action={formAction} className="card grid gap-3 p-4 sm:grid-cols-2"><div className="sm:col-span-2"><FormError message={state?.error} /><label className="field-label">Projeto estratégico</label><input name="name" required className="input-field mt-1" placeholder="Ex.: Redução de perdas na tecelagem" /></div><label><span className="field-label">Área</span><select name="departmentId" className="input-field mt-1"><option value="">Corporativo</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span className="field-label">Indicador associado</span><select name="kpiId" className="input-field mt-1"><option value="">Sem vínculo</option>{kpis.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span className="field-label">Início</span><input type="date" name="startDate" className="input-field mt-1" /></label><label><span className="field-label">Conclusão</span><input type="date" name="dueDate" className="input-field mt-1" /></label><label><span className="field-label">Orçamento</span><input type="number" min="0" step="0.01" name="budget" className="input-field mt-1" /></label><div className="flex items-end justify-end"><SubmitButton>Criar projeto</SubmitButton></div><label className="sm:col-span-2"><span className="field-label">Resultado esperado</span><textarea name="description" rows={2} className="input-field mt-1 resize-none" /></label></form>;
}

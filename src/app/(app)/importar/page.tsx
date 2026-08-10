import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKpiStatus } from "@/lib/kpi";
import Papa from "papaparse";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function uploadCsv(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const file = formData.get("file") as File;
    if (!file || !file.name.endsWith(".csv")) {
      return { error: "Por favor, envie um arquivo .csv válido." };
    }

    const text = await file.text();
    
    // Parse CSV
    const { data, errors } = Papa.parse<{
      kpiId: string;
      period: string;
      actual: string;
      justification?: string;
    }>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      console.error(errors);
      return { error: "Erro na leitura do CSV. Verifique a formatação." };
    }

    let successCount = 0;
    
    // Process rows sequentially to avoid race conditions in recalculations
    for (const row of data) {
      if (!row.kpiId || !row.period || !row.actual) continue;

      const actualNum = parseFloat(row.actual.replace(",", "."));
      if (isNaN(actualNum)) continue;

      const kpi = await prisma.kpi.findUnique({ where: { id: row.kpiId } });
      if (!kpi) continue;

      // Ensure user has permission to edit this KPI
      // In a real app we would check `canEdit(session.user.id, kpi.ownerId)`
      if (session.user.role !== "ADMIN" && session.user.id !== kpi.ownerId) continue;

      // Find if we already have a goal for this period
      const existing = await prisma.measurement.findUnique({
        where: { kpiId_period: { kpiId: kpi.id, period: row.period } }
      });

      const goalToUse = existing?.goal ?? 0; // Fallback to 0 if no goal was set yet
      
      const trafficLight = getKpiStatus(
        goalToUse,
        actualNum,
        kpi.direction,
        kpi.yellowRange,
        kpi.redRange
      );

      // Save to database
      await prisma.measurement.upsert({
        where: { kpiId_period: { kpiId: kpi.id, period: row.period } },
        update: {
          actual: actualNum,
          trafficLight,
          // justification: row.justification // Prisma Architect is adding this field
        },
        create: {
          kpiId: kpi.id,
          period: row.period,
          goal: goalToUse,
          actual: actualNum,
          trafficLight,
          reportedById: session.user.id,
          // justification: row.justification
        }
      });
      
      successCount++;
    }

    revalidatePath("/metas");
    revalidatePath("/");
    
    return { success: `Foram atualizadas ${successCount} medições com sucesso.` };
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title text-[var(--color-ink-900)] font-bold text-[20px]">
          Importação em Massa (Excel/CSV)
        </h1>
        <p className="page-subtitle text-[var(--color-ink-500)] mt-1">
          Atualize dezenas de medições e pareceres de uma vez subindo uma planilha.
        </p>
      </div>

      <div className="card max-w-[600px] p-6 border border-[var(--color-border)] shadow-sm rounded-lg bg-white">
        <form action={uploadCsv} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-[13px] text-[var(--color-ink-700)]">
              Selecione o arquivo (.csv)
            </label>
            <div className="flex items-center gap-3 w-full border-2 border-dashed border-[var(--color-ink-200)] p-8 rounded-lg bg-[var(--color-neutral-50)] justify-center cursor-pointer hover:bg-[var(--color-neutral-100)] transition-colors relative">
              <input 
                type="file" 
                name="file" 
                accept=".csv" 
                required 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="text-[var(--color-ink-400)] h-8 w-8" />
              <div className="text-center">
                <span className="text-[13px] font-medium text-[var(--color-brand-600)] underline">Clique para procurar</span>
                <span className="text-[13px] text-[var(--color-ink-500)] ml-1">ou arraste o arquivo aqui.</span>
              </div>
            </div>
            
            <div className="mt-3 p-4 bg-[var(--color-blue-50)] rounded border border-[var(--color-blue-100)] text-[12px] text-[var(--color-blue-800)] flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1">Formato obrigatório das colunas:</strong>
                <code className="bg-white px-1.5 py-0.5 rounded border border-[var(--color-blue-200)] mr-1">kpiId</code>
                <code className="bg-white px-1.5 py-0.5 rounded border border-[var(--color-blue-200)] mr-1">period</code>
                <code className="bg-white px-1.5 py-0.5 rounded border border-[var(--color-blue-200)] mr-1">actual</code>
                <code className="bg-white px-1.5 py-0.5 rounded border border-[var(--color-blue-200)]">justification</code>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
            <SubmitButton>
              <Upload className="h-4 w-4 mr-2 inline-block" /> Iniciar Importação
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

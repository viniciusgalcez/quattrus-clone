import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ImportReport = {
  created: number;
  updated: number;
  errors: { line: number; message: string }[];
  jobId?: string;
  queued?: boolean;
};

const ASYNC_ROW_THRESHOLD = 40;

export async function assertNoConcurrentImport(userId: string): Promise<string | null> {
  const running = await prisma.importJob.findFirst({
    where: {
      requestedById: userId,
      status: { in: ["ENFILEIRADO", "PROCESSANDO"] },
      completedAt: null,
    },
    select: { id: true, fileName: true },
  });
  if (!running) return null;
  return `Já existe uma importação em andamento (${running.fileName}). Aguarde a conclusão no histórico.`;
}

export async function createImportJobShell(input: {
  type: string;
  fileName: string;
  userId: string;
  status?: "ENFILEIRADO" | "PROCESSANDO";
}) {
  return prisma.importJob.create({
    data: {
      type: input.type,
      fileName: input.fileName,
      status: input.status ?? "PROCESSANDO",
      created: 0,
      updated: 0,
      errors: [],
      requestedById: input.userId,
    },
  });
}

export async function finalizeImportJob(jobId: string, report: ImportReport, statusOverride?: string) {
  const status = statusOverride ?? (report.errors.length ? "CONCLUIDO_COM_ERROS" : "CONCLUIDO");
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status,
      created: report.created,
      updated: report.updated,
      errors: report.errors,
      completedAt: new Date(),
    },
  });
}

export function shouldQueueImport(rowCount: number) {
  return rowCount >= ASYNC_ROW_THRESHOLD;
}

export function enqueueImportProcessing(options: {
  jobId: string;
  process: () => Promise<ImportReport>;
  revalidate?: string[];
}) {
  after(async () => {
    try {
      await prisma.importJob.update({
        where: { id: options.jobId },
        data: { status: "PROCESSANDO" },
      });
      const report = await options.process();
      await finalizeImportJob(options.jobId, report);
      for (const path of options.revalidate ?? ["/importacao-exportacao"]) {
        revalidatePath(path);
      }
    } catch (error) {
      console.error("[import-queue] background processing failed", error);
      await prisma.importJob.update({
        where: { id: options.jobId },
        data: {
          status: "FALHOU",
          errors: [
            {
              line: 0,
              message: error instanceof Error ? error.message : "Falha na fila de importação.",
            },
          ],
          completedAt: new Date(),
        },
      });
      revalidatePath("/importacao-exportacao");
    }
  });
}

export type ImportJobErrorLine = { line: number; message: string };

export function parseImportJobErrors(value: unknown): ImportJobErrorLine[] {
  if (!Array.isArray(value)) return [];
  const lines: ImportJobErrorLine[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const line = Number((raw as { line?: unknown }).line);
    const message = (raw as { message?: unknown }).message;
    if (!Number.isFinite(line) || typeof message !== "string") continue;
    lines.push({ line, message });
  }
  return lines;
}

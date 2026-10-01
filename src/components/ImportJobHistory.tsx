import { parseImportJobErrors } from "@/lib/import-queue";

type ImportHistoryJob = {
  id: string;
  fileName: string;
  type: string;
  status: string;
  created: number;
  updated: number;
  errors: unknown;
  completedAt: Date | null;
  requestedBy: { name: string };
};

export function ImportJobHistory({ jobs }: { jobs: ImportHistoryJob[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">Histórico de importações</h2>
        <p className="mt-1 text-[11px] text-[var(--color-ink-400)]">
          Erros ficam gravados por linha. Lotes grandes (≥40 linhas) entram na fila assíncrona.
        </p>
      </div>
      <div className="table-scroll">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Tipo</th>
              <th>Solicitado por</th>
              <th>Status</th>
              <th>Resultado</th>
              <th>Erros por linha</th>
              <th>Concluído</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--color-ink-500)]">
                  Nenhuma importação registrada.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const errors = parseImportJobErrors(job.errors);
                return (
                  <tr key={job.id}>
                    <th scope="row">{job.fileName}</th>
                    <td>{job.type}</td>
                    <td>{job.requestedBy.name}</td>
                    <td>{job.status.replaceAll("_", " ")}</td>
                    <td>
                      {job.created} criado(s), {job.updated} atualizado(s), {errors.length} erro(s)
                    </td>
                    <td className="max-w-[280px]">
                      {errors.length === 0 ? (
                        <span className="text-[var(--color-ink-400)]">—</span>
                      ) : (
                        <details>
                          <summary className="cursor-pointer text-[12px] font-semibold text-[var(--color-red-700)]">
                            Ver {errors.length} erro(s)
                          </summary>
                          <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-4 text-[11px] text-[var(--color-red-700)]">
                            {errors.map((error, index) => (
                              <li key={`${job.id}-${error.line}-${index}`}>
                                Linha {error.line}: {error.message}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td>{job.completedAt?.toLocaleString("pt-BR") ?? "Em andamento"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

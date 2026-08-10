import Link from "next/link";
import type { KpiTreeNode } from "@/lib/kpi-tree";
import { Bolinha } from "@/components/Bolinha";

function TreeRow({ node, depth }: { node: KpiTreeNode; depth: number }) {
  return (
    <>
      <tr>
        <td>
          <div style={{ paddingLeft: depth * 20 }} className="flex items-center gap-2">
            {depth > 0 && (
              <span aria-hidden className="text-[var(--color-ink-400)]">
                └
              </span>
            )}
            <div>
              <Link
                href={`/metas/${node.id}`}
                className="font-medium text-[var(--color-brand-700)] hover:underline"
              >
                {node.name}
              </Link>
              <div className="text-[11px] text-[var(--color-ink-400)]">
                {node.ownerName}
                {node.departmentName && ` · ${node.departmentName}`}
              </div>
            </div>
          </div>
        </td>
        <td className="font-mono-num text-right">
          {node.goal !== null ? `${node.goal} ${node.metricUnit}` : "—"}
        </td>
        <td className="font-mono-num text-right">
          {node.actual !== null ? `${node.actual} ${node.metricUnit}` : "—"}
        </td>
        <td className="font-mono-num text-right">
          {node.deviation !== null ? `${node.deviation.toFixed(1)}%` : "—"}
        </td>
        <td className="text-right">
          <Bolinha status={node.status} className="justify-end" />
        </td>
      </tr>
      {node.children.map((child) => (
        <TreeRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function KpiTree({ nodes }: { nodes: KpiTreeNode[] }) {
  if (nodes.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-[12.5px] text-[var(--color-ink-400)]">
        Nenhum indicador cadastrado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-modern min-w-[640px]">
        <thead>
          <tr>
            <th>Indicador</th>
            <th className="text-right">Meta</th>
            <th className="text-right">Realizado</th>
            <th className="text-right">Desvio</th>
            <th className="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <TreeRow key={node.id} node={node} depth={0} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import { auth } from "@/lib/auth";
import { assertPageModule } from "@/lib/module-access";
import { currentPeriod, periodLabel } from "@/lib/kpi";
import { getSubordinateIds } from "@/lib/hierarchy";
import { buildKpiTree } from "@/lib/kpi-tree";
import { KpiReactFlow } from "@/components/KpiReactFlow";
import { EmptyState } from "@/components/EmptyState";

export default async function DesdobramentoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "dashboard");

  const period = currentPeriod();
  const subordinates = await getSubordinateIds(session.user.id);
  const ownerIds = [session.user.id, ...subordinates];

  const tree = await buildKpiTree(ownerIds, period);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Desdobramento de indicadores</h1>
        <p className="page-subtitle">
          Como os indicadores operacionais impactam os estratégicos — {periodLabel(period)}.
        </p>
      </div>

      <div className="card overflow-hidden p-0 rounded-lg shadow-sm border border-[var(--color-border)]">
        {tree.length === 0 ? (
          <EmptyState
            icon={Network}
            title="Nenhuma árvore para desenhar"
            description="Este mapa liga cada indicador ao indicador que ele alimenta, mostrando de onde vem o resultado estratégico. Ele aparece quando existem metas cadastradas para você ou sua equipe e ao menos uma delas aponta para uma meta-pai."
            actions={[
              { href: "/metas/novo", label: "Cadastrar meta" },
              { href: "/metas", label: "Ver indicadores", variant: "ghost" },
            ]}
          />
        ) : (
          <KpiReactFlow tree={tree} />
        )}
      </div>
    </div>
  );
}

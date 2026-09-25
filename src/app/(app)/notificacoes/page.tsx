import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Bell, CheckCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";
import {
  groupNotificationsForDisplay,
  NOTIFICATION_GROUP_LABEL,
  type NotificationGroup,
} from "@/lib/notifications";
import { EmptyState } from "@/components/EmptyState";

const GROUP_ORDER: NotificationGroup[] = ["PENDENCIAS", "ATUALIZACOES"];
const df = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const dfDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function kpiCode(sequenceNumber: number) {
  return `IC-${String(sequenceNumber).padStart(5, "0")}`;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const status = params.status === "unread" || params.status === "read" ? params.status : "";
  const where: Prisma.NotificationWhereInput = {
    recipientId: session.user.id,
    ...(status === "unread" ? { readAt: null } : {}),
    ...(status === "read" ? { readAt: { not: null } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { body: { contains: query, mode: "insensitive" } },
            { type: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, unreadCount, delegations] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        relatedKpi: { select: { sequenceNumber: true, name: true } },
        fromUser: { select: { name: true, username: true } },
      },
    }),
    prisma.notification.count({ where: { recipientId: session.user.id, readAt: null } }),
    prisma.kpiDelegation.findMany({
      where: { delegateId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        kpi: { select: { id: true, name: true, sequenceNumber: true, owner: { select: { name: true } } } },
        delegatedBy: { select: { name: true } },
      },
    }),
  ]);
  const grouped = groupNotificationsForDisplay(items);
  const hasFilters = Boolean(query || status);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="dashboard-kicker">Central de comunicação</div>
          <h1 className="page-title mt-1 text-[25px]">Notificações</h1>
          <p className="page-subtitle mt-1">Acompanhe aprovações, pendências, atualizações e delegações ativas.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead} noValidate>
            <button type="submit" className="btn btn-primary">
              <CheckCheck className="h-4 w-4" />
              Editar todas (marcar como lidas)
            </button>
          </form>
        )}
      </div>

      {delegations.length > 0 && (
        <section className="card overflow-hidden">
          <div className="card-header">
            <span>Ações delegadas · {delegations.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--color-surface-muted)] text-[11px] uppercase tracking-wide text-[var(--color-ink-500)]">
                <tr>
                  <th className="px-3 py-2 text-left">CID</th>
                  <th className="px-3 py-2 text-left">Item de controle</th>
                  <th className="px-3 py-2 text-left">Responsável original</th>
                  <th className="px-3 py-2 text-left">Delegado por</th>
                  <th className="px-3 py-2 text-left">Desde</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {delegations.map((delegation) => (
                  <tr key={delegation.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 font-mono-num">{kpiCode(delegation.kpi.sequenceNumber)}</td>
                    <td className="px-3 py-2">{delegation.kpi.name}</td>
                    <td className="px-3 py-2">{delegation.kpi.owner.name ?? "Sem responsável"}</td>
                    <td className="px-3 py-2">{delegation.delegatedBy.name ?? "—"}</td>
                    <td className="px-3 py-2">{dfDate.format(delegation.createdAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/metas/${delegation.kpi.id}`} className="text-[var(--color-brand-700)] hover:underline">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <form noValidate method="get" className="card grid gap-3 p-4 md:grid-cols-[1fr_180px_auto]">
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Busca</span>
          <input name="q" defaultValue={query} maxLength={80} className="input-field" placeholder="Título, mensagem ou tipo" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">Status</span>
          <select name="status" defaultValue={status} className="input-field">
            <option value="">Todas</option>
            <option value="unread">Não lidas</option>
            <option value="read">Lidas</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary w-full md:w-auto">Filtrar</button>
          {hasFilters && <Link href="/notificacoes" className="btn w-full md:w-auto">Limpar</Link>}
        </div>
      </form>

      <div className="grid gap-4">
        {items.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Bell}
              title={hasFilters ? "Nenhuma notificação encontrada" : "Tudo em dia"}
              description={hasFilters ? "Revise a busca ou o status para ampliar a lista." : "Quando houver uma aprovação ou pendência para você, ela aparecerá aqui."}
              actions={[{ href: "/", label: "Voltar ao painel", variant: "ghost" }]}
            />
          </div>
        ) : (
          GROUP_ORDER.map((group) => {
            const groupItems = grouped[group];
            if (groupItems.length === 0) return null;
            return (
              <section key={group} className="card overflow-hidden">
                <div className="card-header">
                  <span>{NOTIFICATION_GROUP_LABEL[group]} · {groupItems.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[var(--color-surface-muted)] text-[11px] uppercase tracking-wide text-[var(--color-ink-500)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Ação</th>
                        <th className="px-3 py-2 text-left">CID</th>
                        <th className="px-3 py-2 text-left">Quem</th>
                        <th className="px-3 py-2 text-left">Até quando</th>
                        <th className="px-3 py-2 text-left">Concluído</th>
                        <th className="px-3 py-2 text-left">Origem</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {groupItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`border-t border-[var(--color-border)] align-top ${item.readAt ? "" : "bg-[var(--color-brand-50)]"}`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">{item.type}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-[var(--color-ink-900)]">{item.title}</p>
                            <p className="mt-0.5 text-[var(--color-ink-500)]">{item.body}</p>
                            <p className="mt-0.5 text-[11px] text-[var(--color-ink-400)]">{df.format(item.createdAt)}</p>
                          </td>
                          <td className="px-3 py-2 font-mono-num whitespace-nowrap">
                            {item.relatedKpi ? kpiCode(item.relatedKpi.sequenceNumber) : "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{item.fromUser?.name ?? "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{item.dueAt ? dfDate.format(item.dueAt) : "—"}</td>
                          <td className="px-3 py-2">
                            {item.readAt ? (
                              <span className="badge badge-verde">Sim</span>
                            ) : (
                              <span className="badge badge-amarelo">Não</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{item.originLabel ?? "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              {item.href && (
                                <Link href={item.href} className="text-[var(--color-brand-700)] hover:underline">
                                  Abrir
                                </Link>
                              )}
                              {!item.readAt && (
                                <form
                                  noValidate
                                  action={async () => {
                                    "use server";
                                    await markNotificationRead(item.id);
                                  }}
                                >
                                  <button type="submit" className="text-[var(--color-ink-500)] hover:underline">
                                    Marcar como lida
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}

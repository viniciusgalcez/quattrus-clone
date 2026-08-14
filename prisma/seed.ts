import { PrismaClient, type Direction, type KpiCalculationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getKpiStatus } from "../src/lib/kpi";

const prisma = new PrismaClient();

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type KpiDef = {
  key: string;
  parentKey?: string;
  ownerKey: string;
  departmentKey: string;
  name: string;
  description: string;
  metricUnit: string;
  direction: Direction;
  calculationType?: KpiCalculationType;
  weight: number;
  yellowRange: number;
  redRange: number;
  priority: number;
  /** goals[i]/actuals[i] pair with monthsAgo(MONTHS_BACK - i); null actual = SEM_DADO for that month. */
  goals: number[];
  actuals: (number | null)[];
  /** 0-based index into goals/actuals whose measurement should start out PENDENTE (awaiting manager approval). */
  pendingApprovalAt?: number;
};

/** How many months of history each series carries — 14 spans two calendar years, enough to exercise the Farol year selector. */
const MONTHS_BACK = 13;

/**
 * Este seed é DESTRUTIVO: ele apaga todos os planos de ação, medições, KPIs,
 * usuários e departamentos antes de recriar as fixtures de demonstração
 * (usuários com a senha fixa "demo123"). Por isso ele só roda quando as duas
 * condições abaixo forem verdadeiras.
 */
function assertDestructiveSeedAllowed() {
  const isProduction = process.env.NODE_ENV === "production";
  const isAllowed = process.env.ALLOW_DESTRUCTIVE_SEED === "true";

  if (isProduction || !isAllowed) {
    console.error("");
    console.error("ERRO: seed destrutivo bloqueado.");
    console.error("");
    console.error(
      "Este script APAGA todos os dados (planos de ação, medições, KPIs, usuários",
    );
    console.error(
      "e departamentos) e cria usuários de demonstração com a senha fixa \"demo123\".",
    );
    console.error("Ele nunca deve ser executado em produção.");
    console.error("");
    console.error(`  NODE_ENV                = ${process.env.NODE_ENV ?? "(não definido)"}`);
    console.error(
      `  ALLOW_DESTRUCTIVE_SEED  = ${process.env.ALLOW_DESTRUCTIVE_SEED ?? "(não definido)"}`,
    );
    console.error("");

    if (isProduction) {
      console.error("Motivo: NODE_ENV está definido como \"production\".");
    } else {
      console.error(
        "Motivo: a variável ALLOW_DESTRUCTIVE_SEED não está definida como \"true\".",
      );
      console.error("");
      console.error("Para rodar em desenvolvimento, execute:");
      console.error("  ALLOW_DESTRUCTIVE_SEED=true npm run db:seed");
      console.error("  (PowerShell: $env:ALLOW_DESTRUCTIVE_SEED=\"true\"; npm run db:seed)");
    }
    console.error("");

    process.exit(1);
  }
}

async function main() {
  assertDestructiveSeedAllowed();

  await prisma.actionPlan.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.kpi.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await bcrypt.hash("demo123", 10);

  const departments: Record<string, { id: string }> = {};
  for (const name of ["Diretoria", "Comercial", "Produção", "Recursos Humanos", "Financeiro"]) {
    departments[name] = await prisma.department.create({ data: { name } });
  }

  const diretora = await prisma.user.create({
    data: {
      username: "ana.diretora",
      passwordHash,
      name: "Ana Diretora",
      role: "ADMIN",
      departmentId: departments["Diretoria"].id,
    },
  });

  const gestor = await prisma.user.create({
    data: {
      username: "carlos.gestor",
      passwordHash,
      name: "Carlos Gestor",
      role: "GESTOR",
      managerId: diretora.id,
      departmentId: departments["Comercial"].id,
    },
  });

  // Second manager branch — gives the hierarchy width, not just depth, and a
  // separate /aprovacoes queue from Carlos's.
  const marina = await prisma.user.create({
    data: {
      username: "marina.gestora",
      passwordHash,
      name: "Marina Gestora",
      role: "GESTOR",
      managerId: diretora.id,
      departmentId: departments["Financeiro"].id,
    },
  });

  const julia = await prisma.user.create({
    data: {
      username: "julia.colab",
      passwordHash,
      name: "Julia Colaboradora",
      role: "COLABORADOR",
      managerId: gestor.id,
      departmentId: departments["Recursos Humanos"].id,
    },
  });

  const pedro = await prisma.user.create({
    data: {
      username: "pedro.colab",
      passwordHash,
      name: "Pedro Colaborador",
      role: "COLABORADOR",
      managerId: gestor.id,
      departmentId: departments["Produção"].id,
    },
  });

  // Third hierarchy level: reports to a COLABORADOR's manager, not straight to
  // the GESTOR, so the tree in /desdobramento and /farol actually has depth.
  const sergio = await prisma.user.create({
    data: {
      username: "sergio.colab",
      passwordHash,
      name: "Sérgio Colaborador",
      role: "COLABORADOR",
      managerId: pedro.id,
      departmentId: departments["Produção"].id,
    },
  });

  const renata = await prisma.user.create({
    data: {
      username: "renata.colab",
      passwordHash,
      name: "Renata Colaboradora",
      role: "COLABORADOR",
      managerId: marina.id,
      departmentId: departments["Financeiro"].id,
    },
  });

  // Deactivated on purpose — exercises the "Inativo" state on /usuarios and
  // confirms an inactive account is refused at login.
  await prisma.user.create({
    data: {
      username: "roberto.exfunc",
      passwordHash,
      name: "Roberto Ex-Colaborador",
      role: "COLABORADOR",
      active: false,
      departmentId: departments["Produção"].id,
    },
  });

  const users: Record<string, { id: string }> = { diretora, gestor, marina, julia, pedro, sergio, renata };

  const kpiDefs: KpiDef[] = [
    // --- SUM roll-up: Faturamento Bruto = Vendas B2B + Vendas B2C ---
    {
      key: "faturamento",
      ownerKey: "gestor",
      departmentKey: "Comercial",
      name: "Faturamento Bruto",
      description: "Faturamento bruto consolidado no período (milhões de R$). Soma de B2B + B2C.",
      metricUnit: "R$ mi",
      direction: "MORE",
      calculationType: "SUM",
      weight: 30,
      yellowRange: 5,
      redRange: 15,
      priority: 1,
      goals: [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
      actuals: [15.4, 15.7, 16.3, null, 14.3, 13.5, 16.1, 16.4, 15.9, 16.2, 15.1, 14.8, 15.5, 15.9],
    },
    {
      key: "vendas_b2b",
      parentKey: "faturamento",
      ownerKey: "gestor",
      departmentKey: "Comercial",
      name: "Vendas B2B",
      description: "Parcela do faturamento vinda do canal B2B.",
      metricUnit: "R$ mi",
      direction: "MORE",
      weight: 15,
      yellowRange: 5,
      redRange: 15,
      priority: 2,
      goals: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      actuals: [9.6, 9.8, 10.1, null, 9.0, 8.5, 10.0, 10.3, 9.9, 10.1, 9.4, 9.1, 9.7, 10.0],
    },
    {
      key: "vendas_b2c",
      parentKey: "faturamento",
      ownerKey: "gestor",
      departmentKey: "Comercial",
      name: "Vendas B2C",
      description: "Parcela do faturamento vinda do canal B2C (varejo).",
      metricUnit: "R$ mi",
      direction: "MORE",
      weight: 15,
      yellowRange: 5,
      redRange: 15,
      priority: 3,
      goals: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      actuals: [5.8, 5.9, 6.2, null, 5.3, 5.0, 6.1, 6.1, 6.0, 6.1, 5.7, 5.7, 5.8, 5.9],
    },

    // --- Redução de Despesas: hits every farol tier on purpose, plus one
    // gap (SEM_DADO) and a goal awaiting approval on the latest month ---
    {
      key: "despesas",
      ownerKey: "julia",
      departmentKey: "Recursos Humanos",
      name: "Redução de Despesas",
      description: "Percentual de despesas reduzidas frente ao orçamento base.",
      metricUnit: "%",
      direction: "MORE",
      weight: 20,
      yellowRange: 3,
      redRange: 8,
      priority: 4,
      goals: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
      actuals: [14, 16, null, 15.5, 18, 18, 14.7, 14.0, 12.5, 17, 16.5, 15.2, 15.8, 16],
      pendingApprovalAt: 13,
    },
    {
      key: "turnover",
      ownerKey: "julia",
      departmentKey: "Recursos Humanos",
      name: "Turnover",
      description: "Percentual de rotatividade de colaboradores no mês.",
      metricUnit: "%",
      direction: "LESS",
      weight: 25,
      yellowRange: 5,
      redRange: 15,
      priority: 5,
      goals: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      actuals: [4.8, 4.5, 5.2, 4.9, 4.2, 4.2, 5.1, 4.6, 4.9, 5.4, 6.2, 4.7, 4.4, 4.6],
    },

    // --- Three-level chain: Índice de Qualidade > Taxa de Refugo > Refugo
    // Tear 3, the last one owned by a colaborador who reports to Pedro ---
    {
      key: "qualidade",
      ownerKey: "pedro",
      departmentKey: "Produção",
      name: "Índice de Qualidade",
      description: "Percentual de itens aprovados no controle de qualidade.",
      metricUnit: "%",
      direction: "MORE",
      weight: 25,
      yellowRange: 2,
      redRange: 5,
      priority: 6,
      goals: [98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98],
      actuals: [97.5, 98.2, 96.8, 97.9, 96.5, 96, 98.4, 98.1, 97.2, 96.9, 95.8, 97.6, 98.0, 98.3],
    },
    {
      key: "refugo",
      parentKey: "qualidade",
      ownerKey: "pedro",
      departmentKey: "Produção",
      name: "Taxa de Refugo",
      description: "Percentual de tecido descartado por defeito em toda a planta.",
      metricUnit: "%",
      direction: "LESS",
      weight: 10,
      yellowRange: 10,
      redRange: 25,
      priority: 7,
      goals: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      actuals: [2.1, 1.8, 2.4, 2.0, 2.6, 2.9, 1.9, 2.0, 1.7, 2.2, 3.1, 2.0, 1.9, 2.1],
      pendingApprovalAt: 13,
    },
    {
      key: "refugo_tear3",
      parentKey: "refugo",
      ownerKey: "sergio",
      departmentKey: "Produção",
      name: "Refugo Tear 3",
      description: "Percentual de refugo apenas do Tear 3, sob responsabilidade do Sérgio.",
      metricUnit: "%",
      direction: "LESS",
      weight: 5,
      yellowRange: 10,
      redRange: 25,
      priority: 8,
      goals: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      actuals: [1.9, 2.0, 2.3, 1.8, 2.5, 3.2, 2.1, 1.7, 1.6, 2.4, 2.8, 1.9, 1.8, 2.0],
    },

    // --- WEIGHTED roll-up under a second manager branch (Marina/Financeiro),
    // with a child owned by someone who isn't Marina's direct report's peer —
    // exercises cross-owner totalization the way Faturamento does for SUM ---
    {
      key: "despesa_financeiro",
      ownerKey: "marina",
      departmentKey: "Financeiro",
      name: "Despesa Total Financeiro",
      description: "Despesa da diretoria financeira, ponderada entre pessoal (60%) e operacional (40%).",
      metricUnit: "R$ mi",
      direction: "LESS",
      calculationType: "WEIGHTED",
      weight: 20,
      yellowRange: 5,
      redRange: 15,
      priority: 9,
      goals: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      actuals: [3.9, 4.1, 3.8, 4.2, 4.5, 3.7, 3.9, 4.0, 4.6, 3.8, 4.1, 3.9, 4.0, 3.8],
    },
    {
      key: "despesa_pessoal",
      parentKey: "despesa_financeiro",
      ownerKey: "marina",
      departmentKey: "Financeiro",
      name: "Despesa Pessoal",
      description: "Folha e encargos da diretoria financeira.",
      metricUnit: "R$ mi",
      direction: "LESS",
      weight: 60,
      yellowRange: 5,
      redRange: 15,
      priority: 10,
      goals: [2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4],
      actuals: [2.3, 2.5, 2.2, 2.5, 2.7, 2.2, 2.3, 2.4, 2.8, 2.3, 2.5, 2.3, 2.4, 2.3],
    },
    {
      key: "despesa_operacional",
      parentKey: "despesa_financeiro",
      ownerKey: "renata",
      departmentKey: "Financeiro",
      name: "Despesa Operacional",
      description: "Sistemas, viagens e despesas operacionais da diretoria financeira.",
      metricUnit: "R$ mi",
      direction: "LESS",
      weight: 40,
      yellowRange: 5,
      redRange: 15,
      priority: 11,
      goals: [1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6],
      actuals: [1.6, 1.6, 1.6, 1.7, 1.8, 1.5, 1.6, 1.6, 1.8, 1.5, 1.6, 1.6, 1.6, 1.5],
      pendingApprovalAt: 13,
    },
  ];

  const createdKpis: Record<string, { id: string }> = {};

  // Two passes so a child can reference a parent created earlier in the list.
  for (const def of kpiDefs) {
    const kpi = await prisma.kpi.create({
      data: {
        name: def.name,
        description: def.description,
        ownerId: users[def.ownerKey].id,
        departmentId: departments[def.departmentKey].id,
        parentId: def.parentKey ? createdKpis[def.parentKey].id : null,
        metricUnit: def.metricUnit,
        direction: def.direction,
        calculationType: def.calculationType ?? "MANUAL",
        weight: def.weight,
        yellowRange: def.yellowRange,
        redRange: def.redRange,
        priority: def.priority,
      },
    });
    createdKpis[def.key] = kpi;

    const measurements: { id: string; goal: number; actual: number | null; trafficLight: string }[] = [];
    for (let i = MONTHS_BACK; i >= 0; i--) {
      const idx = MONTHS_BACK - i;
      const goal = def.goals[idx];
      const actual = def.actuals[idx];
      if (actual === null) continue; // SEM_DADO: no row at all for that month.

      const trafficLight = getKpiStatus(goal, actual, def.direction, def.yellowRange, def.redRange);
      const pending = def.pendingApprovalAt === idx;
      const measurement = await prisma.measurement.create({
        data: {
          kpiId: kpi.id,
          period: monthsAgo(i),
          goal,
          actual,
          trafficLight,
          reportedById: users[def.ownerKey].id,
          goalApprovalStatus: pending ? "PENDENTE" : "APROVADA",
          goalApprovedById: pending ? null : users[def.ownerKey].id,
          goalApprovedAt: pending ? null : new Date(),
        },
      });
      measurements.push(measurement);
    }

    // Open an FCA on the most recent measurement if it's off target.
    const latest = measurements[measurements.length - 1];
    if (latest && latest.trafficLight !== "VERDE" && latest.trafficLight !== "SEM_DADO") {
      await prisma.actionPlan.create({
        data: {
          kpiId: kpi.id,
          measurementId: latest.id,
          fact: `${def.name} fechou o mês fora da meta (meta ${latest.goal}${def.metricUnit}, realizado ${latest.actual}${def.metricUnit}).`,
          why1: "Resultado do mês abaixo do esperado.",
          status: "ABERTO",
          createdById: users[def.ownerKey].id,
        },
      });
    }

    // One fully worked-through, closed FCA on an older off-target month, so
    // the FCA screens have a CONCLUIDO example with the whole 5-why chain
    // and a Pareto breakdown, not just the auto-opened stub above.
    if (def.key === "refugo") {
      const critico = measurements.find((m) => m.trafficLight === "CRITICO");
      if (critico) {
        await prisma.actionPlan.create({
          data: {
            kpiId: kpi.id,
            measurementId: critico.id,
            fact: `Refugo saltou para ${critico.actual}% no mês, bem acima da meta de ${critico.goal}%.`,
            why1: "Pico de refugo concentrado no Tear 3.",
            why2: "Tear 3 operou com a lâmina de corte fora de especificação.",
            why3: "A troca de lâmina programada atrasou.",
            why4: "O fornecedor da lâmina atrasou a entrega.",
            why5: "Não havia lâmina reserva em estoque de segurança.",
            rootCause: "Falta de estoque de segurança para itens críticos de manutenção do Tear 3.",
            what: "Criar estoque mínimo de lâminas de corte para os teares críticos.",
            who: "Sérgio (Produção)",
            where: "Tear 3",
            when: new Date(),
            why: "Evitar parada/perda de qualidade por falta de insumo de manutenção.",
            how: "Cadastrar item na lista de reposição automática do almoxarifado.",
            howMuch: 3200,
            status: "CONCLUIDO",
            createdById: users[def.ownerKey].id,
            paretoItems: {
              create: [
                { phenomenon: "Lâmina fora de especificação", quantity: 62 },
                { phenomenon: "Ajuste de tensão do tear", quantity: 21 },
                { phenomenon: "Outros", quantity: 17 },
              ],
            },
          },
        });
      }
    }
  }

  console.log("Seed concluido.");
  console.log("Departamentos: Diretoria, Comercial, Produção, Recursos Humanos, Financeiro");
  console.log("Árvore:");
  console.log("  Faturamento Bruto (SUM) > Vendas B2B, Vendas B2C");
  console.log("  Índice de Qualidade > Taxa de Refugo > Refugo Tear 3");
  console.log("  Despesa Total Financeiro (WEIGHTED) > Despesa Pessoal, Despesa Operacional");
  console.log(`Histórico: ${MONTHS_BACK + 1} meses (cobre dois anos-calendário).`);
  console.log("Metas pendentes de aprovação: Redução de Despesas, Taxa de Refugo, Despesa Operacional.");
  console.log("FCA: aberto automático nos indicadores fora da meta + 1 concluído (Taxa de Refugo) com 5 porquês e Pareto.");
  console.log("Usuarios de teste (senha: demo123):");
  console.log("- ana.diretora (ADMIN, Diretoria)");
  console.log("- carlos.gestor (GESTOR, Comercial) — gerencia julia.colab e pedro.colab");
  console.log("- marina.gestora (GESTOR, Financeiro) — gerencia renata.colab");
  console.log("- julia.colab (COLABORADOR, RH)");
  console.log("- pedro.colab (COLABORADOR, Produção) — gerencia sergio.colab");
  console.log("- sergio.colab (COLABORADOR, Produção)");
  console.log("- renata.colab (COLABORADOR, Financeiro)");
  console.log("- roberto.exfunc (COLABORADOR, Produção, INATIVO)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

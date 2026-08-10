import { PrismaClient, type Direction } from "@prisma/client";
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
  weight: number;
  yellowRange: number;
  redRange: number;
  priority: number;
  goals: number[];
  actuals: number[];
};

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
  for (const name of ["Diretoria", "Comercial", "Produção", "Recursos Humanos"]) {
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

  const users: Record<string, { id: string }> = {
    diretora,
    gestor,
    julia,
    pedro,
  };

  const kpiDefs: KpiDef[] = [
    {
      key: "faturamento",
      ownerKey: "gestor",
      departmentKey: "Comercial",
      name: "Faturamento Bruto",
      description: "Faturamento bruto consolidado no período (milhões de R$).",
      metricUnit: "R$ mi",
      direction: "MORE",
      weight: 30,
      yellowRange: 5,
      redRange: 15,
      priority: 1,
      goals: [10, 10, 10, 10, 10, 10],
      actuals: [9.6, 9.8, 10.1, 9.4, 9.0, 8.5],
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
      goals: [6, 6, 6, 6, 6, 6],
      actuals: [5.8, 5.9, 6.2, 5.6, 5.3, 5.0],
    },
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
      priority: 3,
      goals: [15, 15, 15, 15, 15, 15],
      actuals: [14, 16, 17, 15.5, 18, 18],
    },
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
      priority: 4,
      goals: [98, 98, 98, 98, 98, 98],
      actuals: [97.5, 98.2, 96.8, 97.9, 96.5, 96],
    },
    {
      key: "refugo",
      parentKey: "qualidade",
      ownerKey: "pedro",
      departmentKey: "Produção",
      name: "Taxa de Refugo",
      description: "Percentual de tecido descartado por defeito.",
      metricUnit: "%",
      direction: "LESS",
      weight: 10,
      yellowRange: 10,
      redRange: 25,
      priority: 5,
      goals: [2, 2, 2, 2, 2, 2],
      actuals: [2.1, 1.8, 2.4, 2.0, 2.6, 2.9],
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
      priority: 6,
      goals: [5, 5, 5, 5, 5, 5],
      actuals: [4.8, 4.5, 5.2, 4.9, 4.2, 4.2],
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
        weight: def.weight,
        yellowRange: def.yellowRange,
        redRange: def.redRange,
        priority: def.priority,
      },
    });
    createdKpis[def.key] = kpi;

    const measurements = [];
    for (let i = 5; i >= 0; i--) {
      const idx = 5 - i;
      const goal = def.goals[idx];
      const actual = def.actuals[idx];
      const measurement = await prisma.measurement.create({
        data: {
          kpiId: kpi.id,
          period: monthsAgo(i),
          goal,
          actual,
          trafficLight: getKpiStatus(goal, actual, def.direction, def.yellowRange, def.redRange),
          reportedById: users[def.ownerKey].id,
        },
      });
      measurements.push(measurement);
    }

    // Open an FCA on the most recent measurement if it's off target.
    const latest = measurements[measurements.length - 1];
    if (latest.trafficLight !== "VERDE" && latest.trafficLight !== "SEM_DADO") {
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
  }

  console.log("Seed concluido.");
  console.log("Departamentos: Diretoria, Comercial, Produção, Recursos Humanos");
  console.log("Árvore: Faturamento Bruto > Vendas B2B | Índice de Qualidade > Taxa de Refugo");
  console.log("Usuarios de teste (senha: demo123):");
  console.log("- ana.diretora (ADMIN, Diretoria)");
  console.log("- carlos.gestor (GESTOR, Comercial)");
  console.log("- julia.colab (COLABORADOR, RH)");
  console.log("- pedro.colab (COLABORADOR, Produção)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

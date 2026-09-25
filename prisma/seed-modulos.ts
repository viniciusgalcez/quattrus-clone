/**
 * Additive demo data for the new modules (Tarefas, Agenda, Delegação,
 * Facilitação) — unlike seed.ts, this is NOT destructive: it only inserts
 * rows if none exist yet, so it's safe to run against a database that
 * already has real KPI/measurement data.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [ana, carlos, marina, julia, pedro] = await Promise.all(
    ["ana.diretora", "carlos.gestor", "marina.gestora", "julia.colab", "pedro.colab"].map((username) =>
      prisma.user.findUniqueOrThrow({ where: { username } })
    )
  );

  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          what: "Levantar causas do refugo do Tear 3",
          why: "Indicador fechou o mês em vermelho",
          howWhere: "Visita técnica à linha de produção",
          assigneeId: pedro.id,
          startDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          value: 0,
          createdById: carlos.id,
        },
        {
          what: "Preparar apresentação da reunião de resultados",
          why: "Alinhamento mensal com a diretoria",
          howWhere: "Slides no padrão Gestiona",
          assigneeId: julia.id,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: "EM_ANDAMENTO",
          createdById: ana.id,
        },
      ],
    });
    console.log("Tarefas de exemplo criadas.");
  }

  const eventCount = await prisma.calendarEvent.count();
  if (eventCount === 0) {
    const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const in10days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await prisma.calendarEvent.createMany({
      data: [
        {
          title: "Reunião de Resultados — Comercial",
          category: "REUNIAO_RESULTADO",
          startAt: in3days,
          endAt: new Date(in3days.getTime() + 60 * 60 * 1000),
          createdById: carlos.id,
        },
        {
          title: "Treinamento 5 Porquês",
          category: "TREINAMENTO",
          startAt: in10days,
          endAt: new Date(in10days.getTime() + 2 * 60 * 60 * 1000),
          createdById: ana.id,
        },
      ],
    });
    console.log("Eventos de exemplo criados.");
  }

  const facilitationCount = await prisma.facilitation.count();
  if (facilitationCount === 0) {
    await prisma.facilitation.create({
      data: { facilitatorId: marina.id, facilitatedId: julia.id },
    });
    console.log("Facilitação de exemplo criada (marina.gestora facilita julia.colab).");
  }

  console.log("Seed de módulos concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

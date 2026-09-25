import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  importActionPlansCsv,
  importCompanyItemsCsv,
  importKpisCsv,
  importMeasurementsCsv,
  importPeriodicitiesCsv,
  importThresholdsCsv,
} from "./import-actions";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertKpiEditable,
  assertMeasurementEditable,
  assertKpiParentAssignable,
  assertDepartmentAssignable,
  assertFcaResolved,
} from "@/lib/authz";
import { wouldCreateKpiCycle } from "@/lib/kpi-tree";
import { recalculateParentMeasurement } from "@/lib/kpi-cascading";
import { getKpiStatus } from "@/lib/kpi";
import { assertPeriodWritable } from "@/lib/period-locks";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: { create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    department: { findUnique: vi.fn() },
    measurement: { findUnique: vi.fn(), upsert: vi.fn() },
    actionPlan: { findUnique: vi.fn(), upsert: vi.fn() },
    kpiMeasurementPeriod: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    kpiThresholdValidity: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    companySettings: { upsert: vi.fn() },
    importJob: { create: vi.fn() },
  },
}));

vi.mock("@/lib/notifications", () => ({
  getGoalApproverIds: vi.fn(async () => ["manager-1"]),
  notifyUsers: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireUser: vi.fn(),
  assertKpiEditable: vi.fn(),
  assertKpiParentAssignable: vi.fn(),
  assertDepartmentAssignable: vi.fn(),
  assertFcaResolved: vi.fn(),
  assertMeasurementEditable: vi.fn(),
}));

vi.mock("@/lib/kpi-tree", () => ({ wouldCreateKpiCycle: vi.fn() }));
vi.mock("@/lib/kpi-cascading", () => ({ recalculateParentMeasurement: vi.fn() }));
vi.mock("@/lib/period-locks", () => ({ assertPeriodWritable: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/kpi", () => ({
  currentPeriod: vi.fn(() => "2026-08"),
  getKpiStatus: vi.fn(),
}));

const requireUserMock = vi.mocked(requireUser);
const assertKpiEditableMock = vi.mocked(assertKpiEditable);
const assertMeasurementEditableMock = vi.mocked(assertMeasurementEditable);
const assertKpiParentAssignableMock = vi.mocked(assertKpiParentAssignable);
const assertDepartmentAssignableMock = vi.mocked(assertDepartmentAssignable);
const assertFcaResolvedMock = vi.mocked(assertFcaResolved);
const wouldCreateKpiCycleMock = vi.mocked(wouldCreateKpiCycle);
const recalculateParentMock = vi.mocked(recalculateParentMeasurement);
const getKpiStatusMock = vi.mocked(getKpiStatus);
const assertPeriodWritableMock = vi.mocked(assertPeriodWritable);

const kpiCreate = vi.mocked(prisma.kpi.create);
const kpiUpdate = vi.mocked(prisma.kpi.update);
const userFindUnique = vi.mocked(prisma.user.findUnique);
const departmentFindUnique = vi.mocked(prisma.department.findUnique);
const measurementFindUnique = vi.mocked(prisma.measurement.findUnique);
const measurementUpsert = vi.mocked(prisma.measurement.upsert);
const actionPlanFindUnique = vi.mocked(prisma.actionPlan.findUnique);
const actionPlanUpsert = vi.mocked(prisma.actionPlan.upsert);
const measurementPeriodFindFirst = vi.mocked(prisma.kpiMeasurementPeriod.findFirst);
const measurementPeriodCreate = vi.mocked(prisma.kpiMeasurementPeriod.create);
const measurementPeriodUpdate = vi.mocked(prisma.kpiMeasurementPeriod.update);
const thresholdFindFirst = vi.mocked(prisma.kpiThresholdValidity.findFirst);
const thresholdCreate = vi.mocked(prisma.kpiThresholdValidity.create);
const thresholdUpdate = vi.mocked(prisma.kpiThresholdValidity.update);
const companySettingsUpsert = vi.mocked(prisma.companySettings.upsert);
const importJobCreate = vi.mocked(prisma.importJob.create);

const stub = <T,>(value: T) => value as never;

function csvFile(content: string): FormData {
  const fd = new FormData();
  fd.append("file", new File([content], "import.csv", { type: "text/csv" }));
  return fd;
}

function importFile(content: string | Uint8Array, name: string, type: string): FormData {
  const fd = new FormData();
  let fileContent: BlobPart;
  if (typeof content === "string") {
    fileContent = content;
  } else {
    const copy = new Uint8Array(content.byteLength);
    copy.set(content);
    fileContent = copy;
  }
  fd.append("file", new File([fileContent], name, { type }));
  return fd;
}

function oversizedCsvFile(): FormData {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(15 * 1024 * 1024 + 1)], "import.csv", { type: "text/csv" }));
  return fd;
}

const KPI_HEADER =
  "id,nome,descricao,dono,departamento,item_pai_id,unidade,direcao,tipo_calculo,peso,faixa_amarela,faixa_vermelha,prioridade";
const MEASUREMENT_HEADER = "item_id,periodo,meta,realizado,justificativa";
const PERIODICITY_HEADER = "item_id,vigencia_inicio,vigencia_fim";
const THRESHOLD_HEADER = "item_id,vigencia_inicio,vigencia_fim,faixa_amarela,faixa_vermelha";
const ACTION_PLAN_HEADER =
  "medicao_id,fato,porque1,porque2,porque3,porque4,porque5,causa_raiz,o_que,quem,onde,quando,por_que,como,quanto,status";
const COMPANY_ITEM_HEADER =
  "nome_empresa,meses_exibidos,meses_em_branco,vermelho_cronico,data_base_fixa,exibir_meta,amarelo_bom,vermelho_bom,automacoes_desativadas";

describe("importKpisCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "COLABORADOR" }));
    assertKpiEditableMock.mockResolvedValue(stub({}));
    kpiCreate.mockResolvedValue(stub({ id: "new-kpi" }));
    kpiUpdate.mockResolvedValue(stub({ id: "kpi-1" }));
    importJobCreate.mockResolvedValue(stub({ id: "import-1" }));
  });

  it("creates a new item when the id column is blank", async () => {
    const csv = `${KPI_HEADER}\n,Despesa,,,,,R$,MORE,MANUAL,,,,`;
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [] });
    expect(kpiCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Despesa", ownerId: "user-1" }) })
    );
  });

  it("updates an existing item when the id column is filled", async () => {
    const csv = `${KPI_HEADER}\nkpi-1,Despesa,,,,,R$,MORE,MANUAL,,,,`;
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 0, updated: 1, errors: [] });
    expect(assertKpiEditableMock).toHaveBeenCalledWith("kpi-1", expect.objectContaining({ id: "user-1" }));
    expect(kpiUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "kpi-1" } }));
  });

  it("reports a parse error without touching the database", async () => {
    const csv = `${KPI_HEADER}\n,,,,,,R$,MORE,MANUAL,,,,`;
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report?.errors).toHaveLength(1);
    expect(result.report?.errors[0].line).toBe(2);
    expect(kpiCreate).not.toHaveBeenCalled();
  });

  it("keeps processing later rows after one row fails", async () => {
    const csv = [
      KPI_HEADER,
      ",,,,,,R$,MORE,MANUAL,,,,",
      ",Despesa OK,,,,,R$,MORE,MANUAL,,,,",
    ].join("\n");
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [{ line: 2, message: expect.any(String) }] });
  });

  it("accepts semicolon-delimited CSV exports", async () => {
    const csv = KPI_HEADER.replaceAll(",", ";") + "\n;Despesa;;;;;R$;MORE;MANUAL;;;;";
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [] });
    expect(kpiCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Despesa" }) })
    );
  });

  it("accepts tabular XLS text exports", async () => {
    const xlsText = KPI_HEADER.replaceAll(",", "\t") + "\n\tDespesa\t\t\t\t\tR$\tMORE\tMANUAL\t\t\t\t";
    const result = await importKpisCsv(null, importFile(xlsText, "import.xls", "application/vnd.ms-excel"));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [] });
  });

  it("rejects legacy binary XLS files with a clear message", async () => {
    const legacyXls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const result = await importKpisCsv(null, importFile(legacyXls, "import.xls", "application/vnd.ms-excel"));
    expect(result.error).toMatch(/XLS binário legado/);
    expect(kpiCreate).not.toHaveBeenCalled();
  });

  it("blocks a non-admin from importing on behalf of another owner", async () => {
    const csv = `${KPI_HEADER}\n,Despesa,,outra.pessoa,,,R$,MORE,MANUAL,,,,`;
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report?.errors[0].message).toMatch(/administradores/);
    expect(kpiCreate).not.toHaveBeenCalled();
  });

  it("resolves dono to another user's id when the caller is admin", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "admin-1", username: "admin", role: "ADMIN" }));
    userFindUnique.mockResolvedValue(stub({ id: "target-user" }));
    const csv = `${KPI_HEADER}\n,Despesa,,outra.pessoa,,,R$,MORE,MANUAL,,,,`;
    await importKpisCsv(null, csvFile(csv));
    expect(kpiCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: "target-user" }) })
    );
  });

  it("rejects an unknown department by name", async () => {
    departmentFindUnique.mockResolvedValue(null);
    const csv = `${KPI_HEADER}\n,Despesa,,,Inexistente,,R$,MORE,MANUAL,,,,`;
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report?.errors[0].message).toMatch(/Inexistente/);
    expect(assertDepartmentAssignableMock).not.toHaveBeenCalled();
  });

  it("checks that the caller may assign the given parent", async () => {
    const csv = `${KPI_HEADER}\n,Despesa,,,,kpi-parent,R$,MORE,MANUAL,,,,`;
    await importKpisCsv(null, csvFile(csv));
    expect(assertKpiParentAssignableMock).toHaveBeenCalledWith(
      "kpi-parent",
      expect.objectContaining({ id: "user-1" })
    );
  });

  it("rejects a parent link that would create a cycle", async () => {
    wouldCreateKpiCycleMock.mockResolvedValue(true);
    const csv = `${KPI_HEADER}\nkpi-1,Despesa,,,,kpi-parent,R$,MORE,MANUAL,,,,`;
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report?.errors[0].message).toMatch(/ciclo/);
    expect(kpiUpdate).not.toHaveBeenCalled();
  });

  it("rejects faixa_vermelha smaller than faixa_amarela", async () => {
    const csv = `${KPI_HEADER}\n,Despesa,,,,,R$,MORE,MANUAL,,20,10,`;
    const result = await importKpisCsv(null, csvFile(csv));
    expect(result.report?.errors[0].message).toMatch(/faixa_vermelha/);
  });

  it("returns an error, not a thrown exception, when no file is attached", async () => {
    const result = await importKpisCsv(null, new FormData());
    expect(result.error).toMatch(/arquivo/i);
  });

  it("rejects an oversized file before parsing or writing", async () => {
    const result = await importKpisCsv(null, oversizedCsvFile());
    expect(result.error).toMatch(/15 MB/);
    expect(kpiCreate).not.toHaveBeenCalled();
    expect(kpiUpdate).not.toHaveBeenCalled();
  });
});

describe("importMeasurementsCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "COLABORADOR" }));
    assertKpiEditableMock.mockResolvedValue(
      stub({ direction: "MORE", yellowRange: 10, redRange: 20, parentId: null })
    );
    assertFcaResolvedMock.mockResolvedValue(undefined);
    assertPeriodWritableMock.mockResolvedValue(undefined);
    measurementFindUnique.mockResolvedValue(null);
    measurementUpsert.mockResolvedValue(stub({ id: "meas-1" }));
    getKpiStatusMock.mockReturnValue("VERDE");
  });

  it("creates a measurement for a period with no prior row", async () => {
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2026-06,100,90,`;
    const result = await importMeasurementsCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [] });
    expect(assertFcaResolvedMock).toHaveBeenCalledWith("kpi-1", "2026-06");
  });

  it("blocks rows from a closed cycle", async () => {
    assertPeriodWritableMock.mockRejectedValueOnce(new Error("Ciclo fechado."));
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2026-06,100,90,`;
    const result = await importMeasurementsCsv(null, csvFile(csv));
    expect(result.report?.errors).toEqual([{ line: 2, message: "Ciclo fechado." }]);
    expect(measurementUpsert).not.toHaveBeenCalled();
  });

  it("counts as an update when a measurement already exists for that period", async () => {
    measurementFindUnique.mockResolvedValue(stub({ id: "existing-meas" }));
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2026-06,100,90,`;
    const result = await importMeasurementsCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 0, updated: 1, errors: [] });
  });

  it("blocks a future period", async () => {
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2099-01,100,90,`;
    const result = await importMeasurementsCsv(null, csvFile(csv));
    expect(result.report?.errors[0].message).toMatch(/futuro/);
    expect(measurementUpsert).not.toHaveBeenCalled();
  });

  it("surfaces the FCA lock as a row error instead of aborting the batch", async () => {
    assertFcaResolvedMock.mockRejectedValueOnce(new Error("Existe um FCA pendente em Mai/26."));
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2026-06,100,90,\nkpi-2,2026-06,50,45,`;
    const result = await importMeasurementsCsv(null, csvFile(csv));
    expect(result.report?.errors).toEqual([{ line: 2, message: "Existe um FCA pendente em Mai/26." }]);
    expect(result.report?.created).toBe(1);
  });

  it("opens an action plan when the imported result is off-target", async () => {
    getKpiStatusMock.mockReturnValue("VERMELHO");
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2026-06,100,80,Atraso na apuração`;
    await importMeasurementsCsv(null, csvFile(csv));
    expect(actionPlanUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ kpiId: "kpi-1", status: "ABERTO" }) })
    );
  });

  it("does not duplicate an action plan that is already open for that measurement", async () => {
    getKpiStatusMock.mockReturnValue("VERMELHO");
    measurementFindUnique.mockResolvedValue(stub({ id: "existing-meas" }));
    actionPlanFindUnique.mockResolvedValue(stub({ id: "plan-1" }));
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2026-06,100,80,`;
    await importMeasurementsCsv(null, csvFile(csv));
    expect(actionPlanUpsert).not.toHaveBeenCalled();
  });

  it("triggers cascading recalculation when the kpi has a parent", async () => {
    assertKpiEditableMock.mockResolvedValue(
      stub({ direction: "MORE", yellowRange: 10, redRange: 20, parentId: "parent-1" })
    );
    const csv = `${MEASUREMENT_HEADER}\nkpi-1,2026-06,100,90,`;
    await importMeasurementsCsv(null, csvFile(csv));
    expect(recalculateParentMock).toHaveBeenCalledWith("parent-1", "2026-06");
  });
});

describe("importThresholdsCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "GESTOR" }));
    assertKpiEditableMock.mockResolvedValue(stub({ id: "kpi-1" }));
    thresholdFindFirst.mockResolvedValue(null);
    thresholdCreate.mockResolvedValue(stub({ id: "threshold-1" }));
    thresholdUpdate.mockResolvedValue(stub({ id: "threshold-1" }));
    kpiUpdate.mockResolvedValue(stub({ id: "kpi-1" }));
    importJobCreate.mockResolvedValue(stub({ id: "import-1" }));
  });

  it("creates threshold validity rows and updates the current kpi ranges", async () => {
    const csv = `${THRESHOLD_HEADER}\nkpi-1,2026-09,,8,15`;
    const result = await importThresholdsCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [] });
    expect(assertKpiEditableMock).toHaveBeenCalledWith("kpi-1", expect.objectContaining({ id: "user-1" }));
    expect(thresholdCreate).toHaveBeenCalledWith({
      data: { kpiId: "kpi-1", startPeriod: "2026-09", endPeriod: null, yellowRange: 8, redRange: 15 },
    });
    expect(kpiUpdate).toHaveBeenCalledWith({ where: { id: "kpi-1" }, data: { yellowRange: 8, redRange: 15 } });
  });

  it("updates an existing threshold validity row for the same window", async () => {
    thresholdFindFirst.mockResolvedValue(stub({ id: "threshold-1" }));
    const csv = `${THRESHOLD_HEADER}\nkpi-1,2026-09,2026-12,5,20`;
    const result = await importThresholdsCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 0, updated: 1, errors: [] });
    expect(thresholdUpdate).toHaveBeenCalledWith({ where: { id: "threshold-1" }, data: { yellowRange: 5, redRange: 20 } });
  });

  it("reports invalid ranges per line", async () => {
    const csv = `${THRESHOLD_HEADER}\nkpi-1,2026-09,,20,10`;
    const result = await importThresholdsCsv(null, csvFile(csv));
    expect(result.report?.errors).toEqual([{ line: 2, message: "faixa_vermelha deve ser maior ou igual a faixa_amarela." }]);
    expect(thresholdCreate).not.toHaveBeenCalled();
  });
});

describe("importPeriodicitiesCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "GESTOR" }));
    assertKpiEditableMock.mockResolvedValue(stub({ id: "kpi-1" }));
    measurementPeriodFindFirst.mockResolvedValue(null);
    measurementPeriodCreate.mockResolvedValue(stub({ id: "period-1" }));
    measurementPeriodUpdate.mockResolvedValue(stub({ id: "period-1" }));
    importJobCreate.mockResolvedValue(stub({ id: "import-1" }));
  });

  it("creates a KPI measurement-period validity window", async () => {
    const csv = `${PERIODICITY_HEADER}\nkpi-1,2026-01,2026-12`;
    const result = await importPeriodicitiesCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [] });
    expect(assertKpiEditableMock).toHaveBeenCalledWith("kpi-1", expect.objectContaining({ id: "user-1" }));
    expect(measurementPeriodCreate).toHaveBeenCalledWith({
      data: { kpiId: "kpi-1", startPeriod: "2026-01", endPeriod: "2026-12" },
    });
  });

  it("rejects a periodicity window ending before it starts", async () => {
    const csv = `${PERIODICITY_HEADER}\nkpi-1,2026-12,2026-01`;
    const result = await importPeriodicitiesCsv(null, csvFile(csv));
    expect(result.report?.errors).toEqual([{ line: 2, message: "vigencia_fim deve ser maior ou igual a vigencia_inicio." }]);
    expect(measurementPeriodCreate).not.toHaveBeenCalled();
  });
});

describe("importActionPlansCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "GESTOR" }));
    assertMeasurementEditableMock.mockResolvedValue(stub({ id: "meas-1", kpiId: "kpi-1" }));
    actionPlanFindUnique.mockResolvedValue(null);
    actionPlanUpsert.mockResolvedValue(stub({ id: "plan-1" }));
    importJobCreate.mockResolvedValue(stub({ id: "import-1" }));
  });

  it("creates an action plan from an imported measurement row", async () => {
    const csv = `${ACTION_PLAN_HEADER}\nmeas-1,Fato observado,,,,,,Causa raiz,Corrigir,João,Tecelagem,2026-09-30,Evitar recorrência,Executar ajuste,150,ABERTO`;
    const result = await importActionPlansCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 1, updated: 0, errors: [] });
    expect(assertMeasurementEditableMock).toHaveBeenCalledWith("meas-1", expect.objectContaining({ id: "user-1" }));
    expect(actionPlanUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { measurementId: "meas-1" },
        create: expect.objectContaining({ measurementId: "meas-1", kpiId: "kpi-1", createdById: "user-1" }),
      })
    );
  });

  it("updates the existing action plan for the same measurement", async () => {
    actionPlanFindUnique.mockResolvedValue(stub({ id: "plan-1" }));
    const csv = `${ACTION_PLAN_HEADER}\nmeas-1,Fato revisado,,,,,,,,,,,,,,CONCLUIDO`;
    const result = await importActionPlansCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 0, updated: 1, errors: [] });
  });

  it("reports measurement permission failures per line", async () => {
    assertMeasurementEditableMock.mockRejectedValueOnce(new Error("Acesso negado."));
    const csv = `${ACTION_PLAN_HEADER}\nmeas-1,Fato observado,,,,,,,,,,,,,,ABERTO`;
    const result = await importActionPlansCsv(null, csvFile(csv));
    expect(result.report?.errors).toEqual([{ line: 2, message: "Acesso negado." }]);
    expect(actionPlanUpsert).not.toHaveBeenCalled();
  });
});

describe("importCompanyItemsCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "admin-1", username: "admin", role: "ADMIN" }));
    companySettingsUpsert.mockResolvedValue(stub({ id: "capricornio" }));
    importJobCreate.mockResolvedValue(stub({ id: "import-1" }));
  });

  it("updates the Capricornio company settings from a company item import", async () => {
    const csv = `${COMPANY_ITEM_HEADER}\nCapricórnio Têxtil S/A,12,3,4,2026-09,sim,não,não,false`;
    const result = await importCompanyItemsCsv(null, csvFile(csv));
    expect(result.report).toEqual({ created: 0, updated: 1, errors: [] });
    expect(companySettingsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "capricornio" },
        update: expect.objectContaining({ legalName: "Capricórnio Têxtil S/A", displayMonths: 12, blankMonths: 3 }),
      })
    );
  });

  it("blocks non-admin callers from importing company settings", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "GESTOR" }));
    const csv = `${COMPANY_ITEM_HEADER}\nCapricórnio Têxtil S/A,12,3,4,2026-09,sim,não,não,false`;
    const result = await importCompanyItemsCsv(null, csvFile(csv));
    expect(result.error).toMatch(/administradores/);
    expect(companySettingsUpsert).not.toHaveBeenCalled();
  });
});

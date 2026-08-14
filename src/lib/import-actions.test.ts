import { describe, it, expect, vi, beforeEach } from "vitest";
import { importKpisCsv, importMeasurementsCsv } from "./import-actions";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertKpiEditable,
  assertKpiParentAssignable,
  assertDepartmentAssignable,
  assertFcaResolved,
} from "@/lib/authz";
import { wouldCreateKpiCycle } from "@/lib/kpi-tree";
import { recalculateParentMeasurement } from "@/lib/kpi-cascading";
import { getKpiStatus } from "@/lib/kpi";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: { create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    department: { findUnique: vi.fn() },
    measurement: { findUnique: vi.fn(), upsert: vi.fn() },
    actionPlan: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireUser: vi.fn(),
  assertKpiEditable: vi.fn(),
  assertKpiParentAssignable: vi.fn(),
  assertDepartmentAssignable: vi.fn(),
  assertFcaResolved: vi.fn(),
}));

vi.mock("@/lib/kpi-tree", () => ({ wouldCreateKpiCycle: vi.fn() }));
vi.mock("@/lib/kpi-cascading", () => ({ recalculateParentMeasurement: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/kpi", () => ({
  currentPeriod: vi.fn(() => "2026-08"),
  getKpiStatus: vi.fn(),
}));

const requireUserMock = vi.mocked(requireUser);
const assertKpiEditableMock = vi.mocked(assertKpiEditable);
const assertKpiParentAssignableMock = vi.mocked(assertKpiParentAssignable);
const assertDepartmentAssignableMock = vi.mocked(assertDepartmentAssignable);
const assertFcaResolvedMock = vi.mocked(assertFcaResolved);
const wouldCreateKpiCycleMock = vi.mocked(wouldCreateKpiCycle);
const recalculateParentMock = vi.mocked(recalculateParentMeasurement);
const getKpiStatusMock = vi.mocked(getKpiStatus);

const kpiCreate = vi.mocked(prisma.kpi.create);
const kpiUpdate = vi.mocked(prisma.kpi.update);
const userFindUnique = vi.mocked(prisma.user.findUnique);
const departmentFindUnique = vi.mocked(prisma.department.findUnique);
const measurementFindUnique = vi.mocked(prisma.measurement.findUnique);
const measurementUpsert = vi.mocked(prisma.measurement.upsert);
const actionPlanFindUnique = vi.mocked(prisma.actionPlan.findUnique);
const actionPlanUpsert = vi.mocked(prisma.actionPlan.upsert);

const stub = <T,>(value: T) => value as never;

function csvFile(content: string): FormData {
  const fd = new FormData();
  fd.append("file", new File([content], "import.csv", { type: "text/csv" }));
  return fd;
}

const KPI_HEADER =
  "id,nome,descricao,dono,departamento,item_pai_id,unidade,direcao,tipo_calculo,peso,faixa_amarela,faixa_vermelha,prioridade";
const MEASUREMENT_HEADER = "item_id,periodo,meta,realizado,justificativa";

describe("importKpisCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "COLABORADOR" }));
    assertKpiEditableMock.mockResolvedValue(stub({}));
    kpiCreate.mockResolvedValue(stub({ id: "new-kpi" }));
    kpiUpdate.mockResolvedValue(stub({ id: "kpi-1" }));
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
});

describe("importMeasurementsCsv", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "COLABORADOR" }));
    assertKpiEditableMock.mockResolvedValue(
      stub({ direction: "MORE", yellowRange: 10, redRange: 20, parentId: null })
    );
    assertFcaResolvedMock.mockResolvedValue(undefined);
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

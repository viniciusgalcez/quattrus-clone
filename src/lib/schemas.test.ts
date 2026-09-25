import { describe, it, expect } from "vitest";
import {
  createEventSchema,
  createKpiSchema,
  createUserSchema,
  saveKpiConfigurationSchema,
  updateKpiSchema,
  updateUserSchema,
} from "./schemas";

const validCreateFields = {
  name: "Faturamento",
  description: "",
  metricUnit: "R$",
  direction: "MORE",
  weight: "10",
  yellowRange: "5",
  redRange: "15",
  goal: "100",
  departmentId: "",
  parentId: "",
};

function withoutKeys<T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  keys: K[]
): Omit<T, K> {
  const copy = { ...source };
  for (const key of keys) delete copy[key];
  return copy;
}

describe("createKpiSchema", () => {
  it("accepts a fully-filled creation form, including goal", () => {
    const result = createKpiSchema.safeParse(validCreateFields);
    expect(result.success).toBe(true);
  });

  it("rejects a missing goal — the create form always sends one", () => {
    const withoutGoal = withoutKeys(validCreateFields, ["goal"]);
    const result = createKpiSchema.safeParse(withoutGoal);
    expect(result.success).toBe(false);
  });
});

describe("updateKpiSchema", () => {
  // Regression: EditarMetaForm has no `goal` input (goal only exists at
  // creation time, to seed the first Measurement) — updateKpiSchema used to
  // inherit `goal` as required from the shared field set, so every edit
  // failed validation with a generic, field-less "Confira os campos
  // destacados." that EditarMetaForm never actually displayed anywhere.
  it("accepts an edit submission with no goal field", () => {
    const withoutGoal = withoutKeys(validCreateFields, ["goal"]);
    const result = updateKpiSchema.safeParse({ ...withoutGoal, priority: "0" });
    expect(result.success).toBe(true);
  });

  it("still rejects a missing name", () => {
    const rest = withoutKeys(validCreateFields, ["goal", "name"]);
    const result = updateKpiSchema.safeParse({ ...rest, priority: "0" });
    expect(result.success).toBe(false);
  });

  it("still enforces redRange >= yellowRange", () => {
    const withoutGoal = withoutKeys(validCreateFields, ["goal"]);
    const result = updateKpiSchema.safeParse({
      ...withoutGoal,
      priority: "0",
      yellowRange: "20",
      redRange: "5",
    });
    expect(result.success).toBe(false);
  });
});

describe("user password schemas", () => {
  const validUserFields = {
    name: "João Santos",
    username: "joao.santos",
    password: "senha-forte-123",
    role: "COLABORADOR",
    managerId: "",
    departmentId: "",
  };

  it("requires at least 10 characters when creating a user", () => {
    const result = createUserSchema.safeParse({ ...validUserFields, password: "123456789" });
    expect(result.success).toBe(false);
  });

  it("accepts a blank password on user update", () => {
    const result = updateUserSchema.safeParse({
      name: validUserFields.name,
      role: validUserFields.role,
      managerId: "",
      departmentId: "",
      password: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("saveKpiConfigurationSchema", () => {
  const validConfiguration = {
    formulaKind: "QUOTIENT",
    numeratorKpiId: "kpi-numerator",
    denominatorKpiId: "kpi-denominator",
    denominatorAverage: "on",
    itemValidityStart: "2026-01",
    itemValidityEnd: "",
    measurementValidityStart: "2026-01",
    measurementValidityEnd: "2026-12",
    thresholdStart: "2026-01",
    thresholdEnd: "2026-12",
    yellowRange: "5",
    redRange: "15",
  };

  it("accepts a versioned quotient configuration", () => {
    expect(saveKpiConfigurationSchema.safeParse(validConfiguration).success).toBe(true);
  });

  it("rejects an inverted historical window", () => {
    expect(saveKpiConfigurationSchema.safeParse({ ...validConfiguration, thresholdEnd: "2025-12" }).success).toBe(false);
  });

  it("requires both inputs for a quotient", () => {
    expect(saveKpiConfigurationSchema.safeParse({ ...validConfiguration, denominatorKpiId: "" }).success).toBe(false);
  });
});

describe("createEventSchema", () => {
  it("rejects invalid start and end dates", () => {
    const result = createEventSchema.safeParse({
      title: "Reunião de resultado",
      category: "REUNIAO_RESULTADO",
      startAt: "não-é-data",
      endAt: "também-não-é-data",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.startAt).toContain("Data/hora de início inválida.");
      expect(result.error.flatten().fieldErrors.endAt).toContain("Data/hora de término inválida.");
    }
  });
});

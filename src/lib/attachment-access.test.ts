import { describe, expect, it } from "vitest";
import { attachmentModuleForEntity } from "@/lib/attachment-access";

describe("attachmentModuleForEntity", () => {
  it("maps KPI and measurement attachments to the measurements module", () => {
    expect(attachmentModuleForEntity("kpi")).toBe("measurements");
    expect(attachmentModuleForEntity("measurement")).toBe("measurements");
  });

  it("maps action plan attachments to the tasks module", () => {
    expect(attachmentModuleForEntity("actionPlan")).toBe("tasks");
  });

  it("fails closed for unknown attachment destinations", () => {
    expect(attachmentModuleForEntity("user")).toBeNull();
    expect(attachmentModuleForEntity(null)).toBeNull();
  });
});

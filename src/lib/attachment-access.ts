import type { ProfileModule } from "@/lib/profile-permissions";

export type AttachmentEntityType = "actionPlan" | "kpi" | "measurement";

const ATTACHMENT_MODULE_BY_ENTITY: Record<AttachmentEntityType, ProfileModule> = {
  actionPlan: "tasks",
  kpi: "measurements",
  measurement: "measurements",
};

export function attachmentModuleForEntity(entityType: string | null | undefined): ProfileModule | null {
  if (entityType === "actionPlan" || entityType === "kpi" || entityType === "measurement") {
    return ATTACHMENT_MODULE_BY_ENTITY[entityType];
  }
  return null;
}

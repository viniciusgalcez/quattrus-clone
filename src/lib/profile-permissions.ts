export const PROFILE_MODULES = [
  "dashboard",
  "measurements",
  "approvals",
  "imports",
  "agenda",
  "tasks",
  "users",
  "departments",
  "profiles",
] as const;

export type ProfileModule = (typeof PROFILE_MODULES)[number];

const allowedModules = new Set<string>(PROFILE_MODULES);

/** Treat persisted JSON as untrusted input and expose only known modules. */
export function normalizeProfilePermissions(value: unknown): ProfileModule[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ProfileModule => typeof item === "string" && allowedModules.has(item));
}

export function permissionsFromForm(formData: FormData): ProfileModule[] {
  return normalizeProfilePermissions(formData.getAll("permissions"));
}

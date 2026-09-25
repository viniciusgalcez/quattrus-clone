import { notFound } from "next/navigation";
import type { ProfileModule } from "@/lib/profile-permissions";

type ModuleUser = { permissions?: string[] };

export function hasModuleAccess(user: ModuleUser, module: ProfileModule) {
  return user.permissions?.includes(module) === true;
}

/** Route-level guard for profile modules. Server actions keep their role and ownership checks. */
export function assertPageModule(user: ModuleUser, module: ProfileModule) {
  if (!hasModuleAccess(user, module)) notFound();
}

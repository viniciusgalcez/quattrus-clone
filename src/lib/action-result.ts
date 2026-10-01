export type ActionResult = { ok: true } | { ok: false; error: string };

const SAFE_ERROR_NAMES = new Set([
  "ForbiddenError",
  "MeasurementInputError",
  "PeriodLockedError",
]);

export function handleActionError(error: unknown): ActionResult {
  if (error instanceof Error) {
    if (SAFE_ERROR_NAMES.has(error.name)) return { ok: false, error: error.message };
    if (error.message === "Não autenticado.") {
      return { ok: false, error: "Sua sessão expirou. Faça login novamente." };
    }
  }

  console.error("[server-action] unexpected failure", error);
  return { ok: false, error: "Não foi possível completar a ação. Tente novamente." };
}

/** Next.js `<form action>` typing expects `Promise<void>` — wrap ActionResult actions. */
export function asFormAction(
  action: (formData: FormData) => Promise<ActionResult>
): (formData: FormData) => Promise<void> {
  return async (formData) => {
    await action(formData);
  };
}

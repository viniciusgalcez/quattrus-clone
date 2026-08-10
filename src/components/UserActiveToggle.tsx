"use client";

import { setUserActive } from "@/lib/actions";

export function UserActiveToggle({
  userId,
  active,
  disabled,
}: {
  userId: string;
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <form
      action={async () => {
        await setUserActive(userId, !active);
      }}
    >
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? "Você não pode desativar sua própria conta." : undefined}
        className={active ? "badge badge-verde" : "badge badge-neutro"}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {active ? "Ativo" : "Inativo"}
      </button>
    </form>
  );
}

"use client";

import { deleteEvent } from "@/lib/actions";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  return (
    <form noValidate
      action={async () => {
        await deleteEvent(eventId);
      }}
    >
      <button type="submit" className="text-[12px] font-medium text-[var(--color-red-600)] hover:underline">
        Excluir
      </button>
    </form>
  );
}

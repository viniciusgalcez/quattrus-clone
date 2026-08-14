export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11.5px] text-[var(--color-red-600)]">{message}</p>;
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-[var(--color-red-100)] px-3 py-2 text-[12px] text-[var(--color-red-600)]">
      {message}
    </div>
  );
}

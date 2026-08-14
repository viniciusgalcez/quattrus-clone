import Link from "next/link";

type EmptyStateAction = {
  href: string;
  label: string;
  /** Primary by default; use "ghost" for a secondary/learn-more destination. */
  variant?: "primary" | "ghost";
};

/**
 * A useful empty state answers three questions in order: what is this screen
 * for, why is it blank, and what do I do next. "Nada aqui" answers none of them,
 * so `title` + `description` + at least one `action` are the intended shape.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  compact = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "!py-7" : ""}`}>
      <div className="empty-state-icon" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </div>
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-text">{description}</p>
      {actions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={action.variant === "ghost" ? "btn btn-ghost text-[var(--color-brand-700)]" : "btn btn-primary"}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

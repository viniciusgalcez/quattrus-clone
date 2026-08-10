import { STATUS_BADGE_CLASS, STATUS_LABEL, type KpiStatus } from "@/lib/kpi";

export function Bolinha({ status, showLabel = true, className = "" }: { status: KpiStatus; showLabel?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className={STATUS_BADGE_CLASS[status]} title={STATUS_LABEL[status]} />
      {showLabel && (
        <span className="text-[12px] font-medium text-[var(--color-ink-700)] leading-none mt-[1px]">
          {STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
}

/**
 * Route-group fallback. It mirrors the shell every screen in `(app)` shares —
 * page header, then a card band, then a wide content card — at the real
 * heights and card radii, so the layout doesn't jump when the data lands.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>

      {/* Page header: title + subtitle on the left, action button on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-[22px] w-[220px]" />
          <div className="skeleton h-[13px] w-[300px]" />
        </div>
        <div className="skeleton h-[34px] w-[140px] rounded-lg" />
      </div>

      {/* Stat band: the 2/3 performance card beside the 1/3 attention column. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="card flex flex-col gap-4 p-5 lg:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="skeleton h-[11px] w-[90px]" />
              <div className="skeleton h-[46px] w-[110px]" />
              <div className="skeleton h-[11px] w-[190px]" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="skeleton h-[11px] w-[90px]" />
              <div className="skeleton h-[28px] w-[70px]" />
              <div className="skeleton h-[11px] w-[110px]" />
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="skeleton h-[10px] w-full rounded-full" />
            <div className="mt-2.5 flex flex-wrap gap-4">
              <div className="skeleton h-[12px] w-[80px]" />
              <div className="skeleton h-[12px] w-[70px]" />
              <div className="skeleton h-[12px] w-[90px]" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="card flex flex-1 flex-col justify-between p-5">
            <div className="flex flex-col gap-2">
              <div className="skeleton h-[11px] w-[100px]" />
              <div className="skeleton h-[34px] w-[60px]" />
            </div>
            <div className="skeleton mt-3 h-[12px] w-full" />
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <div className="skeleton h-[11px] w-[110px]" />
              <div className="skeleton h-[18px] w-[40px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Content band: a list card beside a chart card — also the shape of the
          single wide table card the other screens render. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="card flex flex-col lg:col-span-2">
          <div className="card-header">
            <div className="skeleton h-[13px] w-[130px]" />
          </div>
          <div className="flex flex-col">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0"
              >
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-[13px] w-[150px]" />
                  <div className="skeleton h-[16px] w-[80px] rounded-full" />
                </div>
                <div className="skeleton h-[15px] w-[52px]" />
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col lg:col-span-3">
          <div className="card-header">
            <div className="skeleton h-[13px] w-[160px]" />
          </div>
          <div className="flex h-[280px] items-end gap-3 p-4">
            {[62, 84, 48, 96, 70, 88].map((height, i) => (
              <div key={i} className="flex flex-1 items-end justify-center gap-1">
                <div className="skeleton w-[22px] rounded-t-[4px]" style={{ height: `${height * 0.7}%` }} />
                <div className="skeleton w-[22px] rounded-t-[4px]" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

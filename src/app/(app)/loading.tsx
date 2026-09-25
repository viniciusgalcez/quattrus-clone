export default function Loading() {
  return <div className="space-y-5" aria-label="Carregando"><div className="skeleton h-24 w-full" /><div className="grid gap-3 lg:grid-cols-3"><div className="skeleton h-40 lg:col-span-2" /><div className="skeleton h-40" /></div><div className="grid gap-3 lg:grid-cols-5"><div className="skeleton h-72 lg:col-span-2" /><div className="skeleton h-72 lg:col-span-3" /></div></div>;
}

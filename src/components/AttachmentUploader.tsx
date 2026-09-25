"use client";

import { useState } from "react";
import { Paperclip, Upload } from "lucide-react";

type Attachment = { id: string; originalName: string; sizeBytes: number };
export function AttachmentUploader({ entityType, entityId, initial = [] }: { entityType: "actionPlan" | "kpi" | "measurement"; entityId: string; initial?: Attachment[] }) {
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState("");
  async function upload(file: File) {
    setMessage("Enviando...");
    const body = new FormData(); body.set("file", file); body.set("entityType", entityType); body.set("entityId", entityId);
    const response = await fetch("/api/attachments", { method: "POST", body });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Falha no envio."); return; }
    setItems((current) => [...current, { id: result.id, originalName: result.name, sizeBytes: file.size }]); setMessage("Anexo enviado.");
  }
  return <div className="space-y-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4" /> Adicionar anexo<input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></label>{message && <span className="ml-2 text-xs text-slate-500">{message}</span>}{items.length > 0 && <div className="flex flex-wrap gap-2">{items.map((item) => <a key={item.id} href={`/api/attachments/${item.id}`} className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"><Paperclip className="h-3 w-3" /> {item.originalName}</a>)}</div>}</div>;
}

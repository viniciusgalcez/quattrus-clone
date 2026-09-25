"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";

const MAX_AVATAR_BYTES = 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

function initials(name: string): string {
  return name
    .split(/[.\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function validateAvatar(file: File): string | null {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) return "Use uma imagem PNG, JPG ou WEBP.";
  if (file.size === 0) return "A imagem selecionada está vazia.";
  if (file.size > MAX_AVATAR_BYTES) return "A foto deve ter no máximo 1 MB.";
  return null;
}

export function AvatarUpload({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [status, setStatus] = useState<string>("PNG, JPG ou WEBP até 1 MB.");
  const [isPending, startTransition] = useTransition();

  async function uploadAvatar(file: File) {
    const error = validateAvatar(file);
    if (error) {
      setStatus(error);
      inputRef.current!.value = "";
      return;
    }

    const optimisticUrl = URL.createObjectURL(file);
    setPreviewUrl(optimisticUrl);
    setStatus("Enviando foto...");

    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setPreviewUrl(avatarUrl);
      setStatus(payload?.error ?? "Não foi possível salvar a foto.");
      URL.revokeObjectURL(optimisticUrl);
      inputRef.current!.value = "";
      return;
    }

    setStatus("Foto atualizada.");
    startTransition(() => router.refresh());
    inputRef.current!.value = "";
  }

  const isBusy = isPending || status === "Enviando foto...";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--color-brand-100)] text-[16px] font-bold text-[var(--color-brand-700)] ring-1 ring-[var(--color-border-strong)]">
          {previewUrl ? (
            <Image src={previewUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{initials(displayName)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-[var(--color-ink-900)]">{displayName}</p>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-500)]">{status}</p>
        </div>
      </div>
      <label className="btn w-full sm:w-auto">
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Trocar foto
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={isBusy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void uploadAvatar(file);
          }}
        />
      </label>
    </div>
  );
}

import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { attachmentDownloadDisposition, resolveUploadPath, resolveUploadRoot } from "./upload-storage";

const originalUploadDir = process.env.UPLOAD_DIR;

afterEach(() => {
  process.env.UPLOAD_DIR = originalUploadDir;
});

describe("upload storage", () => {
  it("resolves generated storage keys inside the configured upload root", () => {
    process.env.UPLOAD_DIR = path.resolve("tmp-uploads");
    const filePath = resolveUploadPath("123e4567-e89b-12d3-a456-426614174000.pdf");
    expect(filePath).toBe(path.join(resolveUploadRoot(), "123e4567-e89b-12d3-a456-426614174000.pdf"));
  });

  it("allows image keys used by profile avatars", () => {
    process.env.UPLOAD_DIR = path.resolve("tmp-uploads");
    expect(resolveUploadPath("123e4567-e89b-12d3-a456-426614174000.webp")).toBe(
      path.join(resolveUploadRoot(), "123e4567-e89b-12d3-a456-426614174000.webp")
    );
  });

  it("rejects traversal-like storage keys", () => {
    process.env.UPLOAD_DIR = path.resolve("tmp-uploads");
    expect(() => resolveUploadPath("../123e4567-e89b-12d3-a456-426614174000.pdf")).toThrow(
      "Nome de arquivo armazenado inválido."
    );
  });

  it("rejects unsupported extensions", () => {
    expect(() => resolveUploadPath("123e4567-e89b-12d3-a456-426614174000.exe")).toThrow(
      "Nome de arquivo armazenado inválido."
    );
  });

  it("sanitizes download filenames for response headers", () => {
    expect(attachmentDownloadDisposition('relatorio"\r\nSet-Cookie:x.pdf')).toBe(
      'attachment; filename="relatorio___Set-Cookie_x.pdf"'
    );
  });
});

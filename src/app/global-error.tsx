"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f6fb" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a2b" }}>
            A aplicação encontrou um erro inesperado
          </h1>
          <p style={{ fontSize: "13px", color: "#6b6b82", maxWidth: 420 }}>
            Tente recarregar a página. Se o problema continuar, contate o administrador.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: "#3d3a8c",
              color: "#fff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}

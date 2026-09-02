"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#eef1f6", color: "#172033", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 440, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>O aplicativo não conseguiu abrir</h1>
            <p style={{ lineHeight: 1.5, marginBottom: 20 }}>Tente novamente. Seus dados continuam salvos neste computador.</p>
            <button
              type="button"
              onClick={reset}
              style={{ border: 0, borderRadius: 10, background: "#172033", color: "white", cursor: "pointer", padding: "12px 18px", font: "inherit" }}
            >
              Tentar novamente
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

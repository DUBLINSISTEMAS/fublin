"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md pt-10">
      <EmptyState
        icon={CircleAlert}
        title="Algo deu errado"
        description="Tente de novo. Se continuar, reinicie o app pelo terminal ou veja o log do servidor."
        action={
          <Button onClick={reset} variant="secondary">
            Tentar novamente
          </Button>
        }
      />
      {error.digest ? (
        <p className="mt-4 text-center text-[12px] text-muted">
          Código do erro: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">{error.digest}</code> — procure por ele no log do servidor.
        </p>
      ) : null}
    </div>
  );
}

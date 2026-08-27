import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md pt-10">
      <EmptyState icon={SearchX} title="Não encontramos essa página" description="O registro pode ter sido excluído ou o endereço está errado." action={<ButtonLink href="/">Voltar para Hoje</ButtonLink>} />
    </div>
  );
}

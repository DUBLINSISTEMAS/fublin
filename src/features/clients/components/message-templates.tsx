import { CalendarCheck, FileText, MessageCircle, Sparkles } from "lucide-react";
import { formatWhen, fromIso } from "@/lib/dates";
import { whatsappUrl } from "@/lib/phone";

type Props = { name: string; phone: string; nextAt?: string | null };

export function MessageTemplates({ name, phone, nextAt }: Props) {
  const first = name.split(" ")[0];
  const templates = [
    nextAt ? { label: "Confirmar horário", icon: CalendarCheck, text: `Olá, ${first}! Passando para confirmar nosso atendimento ${formatWhen(fromIso(nextAt))}. Posso contar com você?` } : null,
    { label: "Pedir documentos", icon: FileText, text: `Olá, ${first}! Para darmos continuidade à sua proposta, pode me enviar os documentos que combinamos?` },
    { label: "Retomar conversa", icon: Sparkles, text: `Olá, ${first}! Tudo bem? Estou retomando nossa conversa para saber se podemos avançar com a sua proposta. Como posso ajudar?` },
  ].filter(Boolean) as { label: string; icon: typeof MessageCircle; text: string }[];

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map(({ label, icon: Icon, text }) => (
        <a key={label} href={whatsappUrl(phone, text)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-lime-soft px-3 text-[12px] font-medium text-lime-ink transition-colors hover:bg-lime">
          <Icon className="size-3.5" aria-hidden />{label}
        </a>
      ))}
    </div>
  );
}

import { Phone, RotateCcw, Store, Video, type LucideIcon } from "lucide-react";
import type { AppointmentKind } from "@/lib/domain";

/** Ícone de cada tipo: dá para ver de relance se o cliente vem à loja ou é atendido de longe. */
export const APPOINTMENT_KIND_ICON: Record<AppointmentKind, LucideIcon> = {
  visita: Store,
  reuniao: Video,
  ligacao: Phone,
  retorno: RotateCcw,
};

import { z } from "zod";
import { optionalString } from "@/lib/validation";

export const leaderInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do líder").max(80, "Nome muito longo"),
  phone: optionalString(z.string().trim().max(30, "Telefone muito longo")),
});

export type LeaderInput = z.output<typeof leaderInputSchema>;

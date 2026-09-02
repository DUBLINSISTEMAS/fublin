import { z } from "zod";

const login = z.string().trim().toLowerCase().min(3, "Use pelo menos 3 caracteres").max(40).regex(/^[a-z0-9._-]+$/, "Use letras, números, ponto, traço ou sublinhado");
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128);

export const loginSchema = z.object({ login, password });
export const setupSchema = loginSchema.extend({ name: z.string().trim().min(2, "Informe seu nome").max(80), setupSecret: z.string().optional() });
export const userInputSchema = setupSchema.extend({
  role: z.enum(["admin", "leader"]),
  leaderId: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.role === "leader" && !value.leaderId) ctx.addIssue({ code: "custom", path: ["leaderId"], message: "Escolha o líder vinculado" });
});

export type LoginInput = z.output<typeof loginSchema>;
export type SetupInput = z.output<typeof setupSchema>;
export type UserInput = z.output<typeof userInputSchema>;

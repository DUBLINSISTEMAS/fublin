import { z } from "zod";
import { USER_ROLES } from "@/lib/domain";

const login = z.string().trim().toLowerCase().min(3, "Use pelo menos 3 caracteres").max(40).regex(/^[a-z0-9._-]+$/, "Use letras, números, ponto, traço ou sublinhado");
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(128);

export const loginSchema = z.object({ login, password });
export const setupSchema = loginSchema.extend({ name: z.string().trim().min(2, "Informe seu nome").max(80), setupSecret: z.string().optional() });
export const userInputSchema = setupSchema.extend({
  role: z.enum(USER_ROLES),
  leaderId: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.role === "leader" && !value.leaderId) ctx.addIssue({ code: "custom", path: ["leaderId"], message: "Escolha o líder vinculado" });
});

/** As duas digitações da senha nova precisam bater — o erro aparece no campo de confirmação. */
function confirmMatches(value: { password: string; confirmPassword: string }, ctx: z.RefinementCtx) {
  if (value.password !== value.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "As senhas não conferem" });
}

/** Troca da própria senha: exige a senha atual para ninguém aproveitar uma tela aberta. */
export const passwordChangeSchema = z
  .object({ currentPassword: z.string().min(1, "Informe a senha atual").max(128), password, confirmPassword: z.string() })
  .superRefine(confirmMatches);

/** Redefinição feita pelo administrador para outra pessoa (sem a senha antiga). */
export const resetPasswordSchema = z
  .object({ id: z.string().trim().min(1).max(64), password, confirmPassword: z.string() })
  .superRefine(confirmMatches);

export type LoginInput = z.output<typeof loginSchema>;
export type SetupInput = z.output<typeof setupSchema>;
export type UserInput = z.output<typeof userInputSchema>;
export type PasswordChangeInput = z.output<typeof passwordChangeSchema>;
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>;

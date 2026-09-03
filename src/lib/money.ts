/** Dinheiro em centavos (inteiro) para nunca sofrer com ponto flutuante. */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const BRL_COMPACT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

/** 30000000 -> "R$ 300.000,00" */
export function formatBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return BRL.format(cents / 100);
}

/** 30000000 -> "R$ 300 mil"; 150000000 -> "R$ 1,5 mi" */
export function formatBRLCompact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return BRL_COMPACT.format(cents / 100);
}

/**
 * Texto que não dá para ler como dinheiro ("abc", "12-3"). É diferente de vazio:
 * campo em branco é `null` (o dono não informou), isto aqui é erro de digitação e
 * precisa virar mensagem na tela — nunca ser tratado como "sem valor".
 */
export const INVALID_MONEY = Symbol("dinheiro inválido");

/** Centavos, `null` (nada digitado) ou `INVALID_MONEY` (texto ilegível). */
export type ParsedMoney = number | null | typeof INVALID_MONEY;

export function isInvalidMoney(value: ParsedMoney): value is typeof INVALID_MONEY {
  return value === INVALID_MONEY;
}

/** Só dígitos e separadores, com sinal opcional: barra "abc", "1o0", "12-3" e "R$". */
const MONEY_TEXT = /^-?[\d.,]+$/;

/**
 * Aceita o que o usuário digita: "300.000", "300000,50", "R$ 1.234,56", "1234.56".
 * Devolve centavos, `null` se o campo está vazio ou `INVALID_MONEY` se o texto não
 * é um número; NaN nunca escapa.
 */
export function parseBRL(input: string | null | undefined): ParsedMoney {
  if (input === null || input === undefined) return null;
  // `\s` já cobre o espaço fino (NBSP) que o Intl usa em "R$ 300.000,00".
  const raw = input.replace(/\s/g, "").replace(/^r\$/i, "");
  if (!raw) return null;
  if (!MONEY_TEXT.test(raw) || !/\d/.test(raw)) return INVALID_MONEY;
  const negative = raw.startsWith("-");
  const digits = raw.replace("-", "");
  // Último separador decide: vírgula = decimal (pt-BR); ponto só é decimal se não houver vírgula e vier seguido de 1–2 dígitos.
  let integerPart = digits;
  let fraction = "";
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  if (lastComma >= 0) {
    integerPart = digits.slice(0, lastComma);
    fraction = digits.slice(lastComma + 1);
  } else if (lastDot >= 0 && digits.length - lastDot - 1 <= 2) {
    integerPart = digits.slice(0, lastDot);
    fraction = digits.slice(lastDot + 1);
  }
  const whole = Number(integerPart.replace(/[.,]/g, "") || "0");
  const cents = Number((fraction.replace(/\D/g, "") + "00").slice(0, 2));
  if (!Number.isFinite(whole) || !Number.isFinite(cents)) return INVALID_MONEY;
  const total = whole * 100 + cents;
  return negative ? -total : total;
}

/** Valor para preencher um input a partir dos centavos: 30000000 -> "300.000,00". */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

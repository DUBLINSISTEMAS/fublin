import {
  addDays,
  addMinutes,
  addMonths,
  differenceInMinutes,
  endOfDay,
  format,
  isValid,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/** Chave de dia no fuso local: "2026-08-27". */
export type DayKey = string;

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const REF = new Date(2000, 0, 1);

export function toIso(date: Date): string {
  return date.toISOString();
}

export function fromIso(iso: string): Date {
  return parseISO(iso);
}

export function dayKey(date: Date): DayKey {
  return format(date, "yyyy-MM-dd");
}

export function isValidDayKey(value: string | null | undefined): value is DayKey {
  if (!value || !DAY_KEY_RE.test(value)) return false;
  const parsed = parse(value, "yyyy-MM-dd", REF);
  return isValid(parsed) && dayKey(parsed) === value;
}

export function isValidTime(value: string | null | undefined): value is string {
  if (!value || !TIME_RE.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h >= 0 && h < 24 && m >= 0 && m < 60;
}

/** Combina "2026-08-27" + "14:30" (hora local) em um Date. */
export function fromLocalInput(day: DayKey, time: string): Date {
  return parse(`${day} ${time}`, "yyyy-MM-dd HH:mm", REF);
}

/** Inverso de `fromLocalInput`, para preencher inputs date/time. */
export function toLocalInput(date: Date): { day: DayKey; time: string } {
  return { day: format(date, "yyyy-MM-dd"), time: format(date, "HH:mm") };
}

export function dayBounds(day: DayKey): { start: Date; end: Date } {
  const base = parse(day, "yyyy-MM-dd", REF);
  return { start: startOfDay(base), end: endOfDay(base) };
}

export function shiftDayKey(day: DayKey, days: number): DayKey {
  return dayKey(addDays(parse(day, "yyyy-MM-dd", REF), days));
}

export function monthStart(now: Date): Date {
  return startOfMonth(now);
}

/** Chave de mês: "2026-08". */
export type MonthKey = string;

export function monthKey(date: Date): MonthKey {
  return format(date, "yyyy-MM");
}

export function isValidMonthKey(value: string | null | undefined): value is MonthKey {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** [início, fim) do mês. */
export function monthRange(key: MonthKey): { start: Date; end: Date } {
  const start = parse(`${key}-01`, "yyyy-MM-dd", REF);
  return { start, end: addMonths(start, 1) };
}

export function shiftMonthKey(key: MonthKey, months: number): MonthKey {
  return monthKey(addMonths(monthRange(key).start, months));
}

/** "Agosto de 2026" */
export function formatMonthLong(date: Date): string {
  const raw = format(date, "MMMM 'de' yyyy", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/** "quarta-feira, 27 de agosto" */
export function formatDayLong(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** "27 ago" */
export function formatDayShort(date: Date): string {
  return format(date, "d MMM", { locale: ptBR }).replace(".", "");
}

/** "Qui" (3 primeiras letras de "quinta-feira"). */
export function formatWeekdayShort(date: Date): string {
  const raw = format(date, "EEEE", { locale: ptBR }).slice(0, 3);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** "27/08/2026" */
export function formatDate(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

/** "Hoje", "Amanhã", "Ontem" ou "27 ago". */
export function formatRelativeDay(date: Date, now: Date = new Date()): string {
  const key = dayKey(date);
  if (key === dayKey(now)) return "Hoje";
  if (key === dayKey(addDays(now, 1))) return "Amanhã";
  if (key === dayKey(addDays(now, -1))) return "Ontem";
  return formatDayShort(date);
}

/** "Hoje às 14:30" / "Amanhã às 09:00" / "27 ago às 10:00" */
export function formatWhen(date: Date, now: Date = new Date()): string {
  return `${formatRelativeDay(date, now)} às ${formatTime(date)}`;
}

export function minutesUntil(target: Date, now: Date): number {
  return differenceInMinutes(target, now);
}

/** Instante em que o lembrete deve disparar. */
export function reminderDueAt(scheduledAt: Date, reminderMinutes: number): Date {
  return addMinutes(scheduledAt, -reminderMinutes);
}

/** Janela em que ainda faz sentido avisar depois do horário (evita spam de coisas velhas). */
export const REMINDER_GRACE_MINUTES = 15;

export function isReminderDue(scheduledAt: Date, reminderMinutes: number, now: Date): boolean {
  const due = reminderDueAt(scheduledAt, reminderMinutes);
  const limit = addMinutes(scheduledAt, REMINDER_GRACE_MINUTES);
  return now >= due && now <= limit;
}

/** Texto curto para o card "Agora": "em 25 min", "agora", "há 10 min". */
export function formatCountdown(target: Date, now: Date): string {
  const diff = minutesUntil(target, now);
  if (Math.abs(diff) < 1) return "agora";
  if (diff > 0) return diff < 60 ? `em ${diff} min` : `em ${Math.floor(diff / 60)} h`;
  const late = -diff;
  return late < 60 ? `há ${late} min` : `há ${Math.floor(late / 60)} h`;
}

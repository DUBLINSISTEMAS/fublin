/** "Ana Paula Souza" -> "AP". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + second).toUpperCase();
}

/** "quinta-feira, 27 de agosto" -> "Quinta-feira, 27 de agosto" (só a primeira letra). */
export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** Plural simples em pt-BR: plural(1, "agendamento") -> "1 agendamento". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

const KB = 1024;
const MB = KB * 1024;

/** 1536 -> "2 KB"; 2.5 MB -> "2,5 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
  return `${(bytes / MB).toFixed(1).replace(".", ",")} MB`;
}

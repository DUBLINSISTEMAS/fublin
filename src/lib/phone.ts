/** Mantém só dígitos. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** "(11) 98765-4321" ou "(11) 3456-7890"; devolve o original se não reconhecer. */
export function formatPhone(value: string): string {
  const d = digitsOnly(value);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

function withCountryCode(value: string): string {
  const d = digitsOnly(value);
  return d.length <= 11 ? `55${d}` : d;
}

/** Link do WhatsApp com DDI 55 se faltar. */
export function whatsappUrl(value: string): string {
  return `https://wa.me/${withCountryCode(value)}`;
}

export function telUrl(value: string): string {
  return `tel:+${withCountryCode(value)}`;
}

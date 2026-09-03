import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Por que `script-src` ainda tem 'unsafe-inline' — e por que trocá-lo pelo hash do
 * `APPEARANCE_SCRIPT` (`src/lib/theme.ts`) não resolve:
 *
 * O script de aparência não é o único inline da página. O App Router entrega o payload RSC
 * em scripts inline que o próprio Next gera (`self.__next_f.push(...)`, `self.__next_r=...`),
 * com conteúdo diferente a cada requisição — impossível de fixar num hash. E, pela regra do
 * CSP, "'unsafe-inline' is ignored if either a hash or nonce value is present": basta
 * declarar um hash para os scripts do Next serem bloqueados e a página não hidratar
 * (medido no navegador: três scripts inline bloqueados e o RSC nunca chega).
 *
 * O caminho certo é um nonce por requisição em `src/proxy.ts`: o Next lê o nonce do
 * cabeçalho CSP e o repassa para as tags que emite, incluindo a do <head>. Com isso
 * `script-src` vira `'self' 'nonce-…'` e o 'unsafe-inline' cai de vez.
 *
 * Em desenvolvimento sobra o 'unsafe-eval', que o React usa para reconstruir pilhas de erro.
 */
const scriptSrc = isProduction ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

// ws:/wss: existem só para o socket do HMR; o app em produção não abre WebSocket nenhum.
const connectSrc = isProduction ? "connect-src 'self'" : "connect-src 'self' ws: wss:";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  scriptSrc,
  // Next/Tailwind aplicam estilos inline durante renderização e desenvolvimento.
  "style-src 'self' 'unsafe-inline'",
  connectSrc,
  "worker-src 'self' blob:",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(process.env.VERCEL ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  // O migrador lê estes SQLs em runtime; inclua-os no pacote de todas as rotas serverless.
  outputFileTracingIncludes: { "/*": ["./drizzle/**/*"] },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;

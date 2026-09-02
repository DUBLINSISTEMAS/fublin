import type { NextConfig } from "next";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // O script mínimo de aparência roda antes da hidratação; não processa entrada externa.
  "script-src 'self' 'unsafe-inline'",
  // Next/Tailwind aplicam estilos inline durante renderização e desenvolvimento.
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' ws: wss:",
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

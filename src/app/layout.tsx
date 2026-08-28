import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { APPEARANCE_SCRIPT } from "@/lib/theme";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

/* Manifest e ícone da Apple vêm das convenções de arquivo (`manifest.ts`, `apple-icon.tsx`). */
export const metadata: Metadata = {
  title: { default: "Relacionador", template: "%s · Relacionador" },
  description: "Gestão de clientes e agendamentos para relacionadores de consórcio.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Relacionador" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1526" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Tema e densidade salvos entram antes da hidratação, sem piscar em branco. */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { THEME_STORAGE_KEY } from "@/lib/theme";
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

/** Roda antes da hidratação: aplica o tema salvo (ou o do sistema) sem piscar em branco. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

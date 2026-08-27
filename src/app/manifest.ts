import type { MetadataRoute } from "next";

/** PWA: "Adicionar à tela inicial" no celular. Cores seguem os tokens de `globals.css`. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relacionador",
    short_name: "Relacionador",
    description: "Gestão de clientes e agendamentos para relacionadores de consórcio.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef1f6",
    theme_color: "#3b7bff",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

import type { MetadataRoute } from "next";

/** PWA: "Adicionar à tela inicial" no celular e no tablet. Cores seguem os tokens de `globals.css`. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relacionador",
    short_name: "Relacionador",
    description: "Gestão de clientes, agenda e metas para relacionadores de consórcio.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#eef1f6",
    theme_color: "#3b7bff",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

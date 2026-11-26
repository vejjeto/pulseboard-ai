import type { Metadata } from "next";
import type React from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "FlowMind Kanban AI — Tablero inteligente con Fractional Indexing",
  description:
    "Gestión visual con Drag & Drop optimista a 0ms, vistas Kanban/Tabla/Calendario sincronizadas, desglose de objetivos con IA y detección de cuellos de botella.",
};

const DARK_MODE_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("flowmind-theme")||localStorage.getItem("theme");if(t==="light"){document.documentElement.classList.remove("dark");}else{document.documentElement.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static inline theme init */}
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

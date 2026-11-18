import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Torricelli Challenge — El profesor contra la física",
  description: "Un laboratorio hidráulico interactivo. Tres tanques, una ley física y el equilibrio en tus manos.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}

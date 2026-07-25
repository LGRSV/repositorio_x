import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transforma · Auditoria Base 134",
  description: "Auditoria de transformadores por SS, OS, obra, material, SIGCO e aprovação.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

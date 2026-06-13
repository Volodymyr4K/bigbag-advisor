import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "bigbag-advisor — радник підбору біг-бегів (демо ВБА)",
  description: "Чесно-виміряний радник підбору біг-бегів + маршрутизатор запитів у відділи.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}

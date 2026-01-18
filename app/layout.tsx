import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Projekta",
  description: "ניהול פרויקטים חכם",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

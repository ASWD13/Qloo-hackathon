import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: "../public/fonts/barlow-condensed-bold.ttf",
  variable: "--font-display",
  weight: "700",
  display: "swap",
});
const body = localFont({
  src: [
    { path: "../public/fonts/manrope-regular.ttf", weight: "400" },
    { path: "../public/fonts/manrope-semibold.ttf", weight: "600" },
  ],
  variable: "--font-body",
  display: "swap",
});
export const metadata: Metadata = {
  title: "TasteSpace — Your taste, made spatial",
  description:
    "Turn the music, films, brands and worlds you love into an editable bedroom.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}

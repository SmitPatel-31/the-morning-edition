import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, UnifrakturMaguntia } from "next/font/google";
import "./globals.css";

const unifraktur = UnifrakturMaguntia({
  variable: "--font-unifraktur",
  subsets: ["latin"],
  weight: "400",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: { default: "The Morning Edition", template: "%s · The Morning Edition" },
  description: "Your inbox, calendar, code reviews and Slack, edited into one front page every morning.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${unifraktur.variable} ${playfair.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

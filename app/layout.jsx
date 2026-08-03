import "./globals.css";
import { Inter, Lora } from "next/font/google";

// Loading fonts with the "vietnamese" subset guarantees the precomposed
// Vietnamese diacritic glyphs are included. Georgia (a system font) is
// missing several of these combinations, which is why titles like
// "Nền" or "vết" were rendering broken (marks detached from the letter).
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata = {
  title: "Tuyển UGC theo Campaign",
  description: "Hệ thống đăng ký & quản lý UGC cho các brand/campaign",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}

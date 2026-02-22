import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Uploaded to Vercel CDN, may still fail if no net, but let's try or use system font
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AffCash - Affiliate Cashback Platform",
  description: "Nền tảng hoàn tiền affiliate hàng đầu Việt Nam. Chuyển đổi link Shopee & TikTok Shop để nhận cashback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}



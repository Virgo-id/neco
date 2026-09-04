import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Floa - Kemudahan dalam satu platform",
    template: "%s | Floa", // Sub-page dapat menggunakan template ini
  },
  description: "Platform belanja modern, responsif, dan terpercaya",
  icons: {
    icon: "/favicon.ico", // Favicon default jika halaman tidak memiliki icon khusus
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="w-full min-h-screen bg-[#ffffff] text-gray-950 flex flex-col md:flex-row relative m-0 p-0">
        <div className="flex-1 flex flex-col min-w-0 w-full relative">
          {children}
        </div>
      </body>
    </html>
  );
}
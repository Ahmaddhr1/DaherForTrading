import { Geist, Geist_Mono, Tajawal } from "next/font/google";
import "./globals.css";
import Providers from "@/lib/providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Arabic UI font, used automatically whenever the page direction is RTL -
// see the [dir="rtl"] rule in globals.css.
const tajawal = Tajawal({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

export const metadata = {
  title: "MDT",
  description: "Admin Panel",
};

export default async function RootLayout({ children }) {

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${tajawal.variable} ${geistSans.className}`}>
      <body
        className="antialiased"
      >
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}

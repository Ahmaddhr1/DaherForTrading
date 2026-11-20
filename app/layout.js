import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/SplashScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Used for the Invento wordmark (splash screen, sidebar, login) - kept
// separate from the Geist body font to match the brand's logo typeface.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata = {
  title: "MDT",
  description: "Admin Panel",
};

export default async function RootLayout({ children }) {

  return (
    <html
      lang="en"
      className={`${geistSans.className} ${geistMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body
        className="antialiased"
      >
        <Providers>
          <SplashScreen />
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}

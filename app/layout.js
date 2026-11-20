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
  title: "Invento",
  description: "Trade and inventory management",
  // Explicit, versioned icon URLs - browsers cache a bare /favicon.ico
  // very aggressively, so after a rebrand the only reliable way to get a
  // new icon to actually show up is to change its URL. Bump the `v`
  // value again if the icon ever changes and still appears stale.
  icons: {
    icon: "/icon.png?v=invento-1",
    shortcut: "/favicon.ico?v=invento-1",
    apple: "/apple-icon.png?v=invento-1",
  },
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

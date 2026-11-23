import { Geist, Geist_Mono, Space_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, dirFor } from "@/core/shared/i18n";
import "./globals.css";
import Providers from "@/core/platform/providers";
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

// Arabic UI font - only used when the language is Arabic (see
// html[lang="ar"] in globals.css), so it isn't preloaded otherwise.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
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
  // The user's language choice (English/Arabic), stored in a cookie by the
  // language switch - read here so the very first render already has the
  // right language and text direction.
  const cookieLang = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = isLang(cookieLang) ? cookieLang : "en";

  return (
    <html
      lang={lang}
      dir={dirFor(lang)}
      className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${plexArabic.variable}`}
      suppressHydrationWarning
    >
      <body
        className="antialiased"
      >
        <Providers lang={lang}>
          <SplashScreen />
          <Toaster dir={dirFor(lang)} position={lang === "ar" ? "top-left" : undefined} />
          {children}
        </Providers>
      </body>
    </html>
  );
}

"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

// Brand splash shown on a hard page load (mounted once in the root layout,
// which persists across client-side navigation in the App Router, so this
// never reappears when switching dashboard pages). Fixed navy/white/amber
// regardless of light/dark mode - matches the "dark" lockup of the Invento
// mark and avoids a flash while next-themes resolves the system theme.
//
// Stays up for at least 3s, and longer if the page's own data (every page
// in this app fetches via react-query) is still loading past that - hides
// only once both the minimum time has elapsed AND nothing is fetching.
export function SplashScreen() {
  const t = useT();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);
  const isFetching = useIsFetching();
  // Print pages (receipts, statements, and the statement print preview)
  // show only the document - no splash over it.
  const isPrintPage = usePathname()?.startsWith("/print/");

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fading || !minTimeElapsed || isFetching > 0) return;
    setFading(true);
  }, [fading, minTimeElapsed, isFetching]);

  useEffect(() => {
    if (!fading) return;
    const hideTimer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(hideTimer);
  }, [fading]);

  if (!visible || isPrintPage) return null;

  return (
    <div
      className={`print:hidden fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B35] transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex items-end gap-4">
        <svg width="64" height="64" viewBox="20 30 102 102" className="shrink-0">
          <rect className="invento-splash-bar" x="20" y="86" width="26" height="46" rx="7" fill="#FFFFFF" style={{ animationDelay: "0s" }} />
          <rect className="invento-splash-bar" x="58" y="58" width="26" height="74" rx="7" fill="#FFFFFF" style={{ animationDelay: "0.15s" }} />
          <rect className="invento-splash-bar" x="96" y="30" width="26" height="102" rx="7" fill="#E8A33D" style={{ animationDelay: "0.3s" }} />
        </svg>
        <span
          className="invento-splash-wordmark text-4xl font-bold leading-none text-white"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          {t("Invento")}
        </span>
      </div>

      <style jsx>{`
        .invento-splash-bar {
          transform-box: fill-box;
          transform-origin: bottom center;
          animation: invento-splash-grow 1.5s ease-in-out infinite;
        }
        .invento-splash-wordmark {
          display: inline-block;
          clip-path: inset(0 100% 0 0);
          animation: invento-splash-reveal 0.6s ease-out 0.3s forwards;
        }
        @keyframes invento-splash-grow {
          0%,
          100% {
            transform: scaleY(0);
          }
          50% {
            transform: scaleY(1);
          }
        }
        @keyframes invento-splash-reveal {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0% 0 0);
          }
        }
      `}</style>
    </div>
  );
}

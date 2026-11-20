"use client";

import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";

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
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);
  const isFetching = useIsFetching();

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

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B35] transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-4">
        <svg width="64" height="64" viewBox="0 0 160 160">
          <rect className="invento-splash-bar" x="20" y="86" width="26" height="46" rx="7" fill="#FFFFFF" style={{ animationDelay: "0s" }} />
          <rect className="invento-splash-bar" x="58" y="58" width="26" height="74" rx="7" fill="#FFFFFF" style={{ animationDelay: "0.15s" }} />
          <rect className="invento-splash-bar" x="96" y="30" width="26" height="102" rx="7" fill="#E8A33D" style={{ animationDelay: "0.3s" }} />
        </svg>
        <span
          className="invento-splash-wordmark text-4xl font-bold text-white"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          Invento
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
          opacity: 0;
          animation: invento-splash-slide 1.5s ease-in-out infinite;
          animation-delay: 0.3s;
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
        @keyframes invento-splash-slide {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-16px);
          }
          40%,
          70% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

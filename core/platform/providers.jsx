"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { LangProvider } from "@/core/shared/i18n/LangProvider";

export default function Providers({ children, lang = "en" }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <LangProvider lang={lang}>{children}</LangProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

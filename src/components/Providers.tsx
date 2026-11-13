"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { StoreProvider } from "@/lib/store";
import { UIProvider } from "@/lib/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <MotionConfig reducedMotion="user">
        <UIProvider>
          <StoreProvider>{children}</StoreProvider>
        </UIProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

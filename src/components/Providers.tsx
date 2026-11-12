"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <MotionConfig reducedMotion="user">
        <StoreProvider>{children}</StoreProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

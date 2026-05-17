import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <p className="text-sm font-semibold tracking-tight">QA Flow Intelligence</p>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}

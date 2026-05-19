import type { ReactNode } from "react";

import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FolderKanban className="size-4 text-muted-foreground" />
            QA Flow Intelligence
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings" className="text-sm text-muted-foreground hover:text-foreground">
              AI Settings
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

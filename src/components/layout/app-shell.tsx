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
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FolderKanban className="size-4 text-muted-foreground" />
            QA Flow Intelligence
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}

"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: Readonly<{
  reset: () => void;
}>) {
  return (
    <AppShell>
      <div className="space-y-3 rounded-lg border p-6">
        <h2 className="text-sm font-medium">Could not load projects</h2>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button onClick={reset} variant="outline">
          Retry
        </Button>
      </div>
    </AppShell>
  );
}

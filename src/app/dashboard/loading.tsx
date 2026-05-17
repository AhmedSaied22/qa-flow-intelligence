import { AppShell } from "@/components/layout/app-shell";

export default function Loading() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        <div className="grid gap-3">
          <div className="h-20 animate-pulse rounded-lg border bg-muted/40" />
          <div className="h-20 animate-pulse rounded-lg border bg-muted/40" />
        </div>
      </div>
    </AppShell>
  );
}

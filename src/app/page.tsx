import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Project Bootstrap Ready</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This foundation includes Next.js, TypeScript, Tailwind, shadcn/ui, and
          dark/light theme support. Feature implementation starts in the next chunk.
        </p>
      </section>
    </AppShell>
  );
}

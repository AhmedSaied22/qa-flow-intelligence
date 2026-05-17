"use client";

import { useMemo, useState } from "react";
import { ArrowRight, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">QA Flow Intelligence</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your Google account to access the dashboard.
          </p>
        </div>

        <Button className="w-full justify-start" onClick={handleLogin} disabled={loading}>
          {loading ? <ArrowRight className="size-4 animate-pulse" /> : <LogIn className="size-4" />}
          Continue with Google
        </Button>
      </section>
    </main>
  );
}

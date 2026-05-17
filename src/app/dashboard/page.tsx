import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Project = Database["public"]["Tables"]["projects"]["Row"];

async function createProject(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    redirect("/dashboard?error=missing-name");
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { error } = await supabase.from("projects").insert({
    owner_id: data.user.id,
    name,
    description: description || null,
  });

  if (error) {
    redirect("/dashboard?error=create-project");
  }

  redirect("/dashboard");
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data }, projectsResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
  ]);

  const projects = (projectsResult.data ?? []) as Project[];

  const email = data.user?.email ?? "Signed in user";

  async function logout() {
    "use server";
    const serverSupabase = await createSupabaseServerClient();
    await serverSupabase.auth.signOut();
  }

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Projects</p>
            <h1 className="text-2xl font-semibold tracking-tight">Your workspace</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>

          <form action={logout}>
            <Button type="submit" variant="outline">
              <LogOut className="size-4" />
              Logout
            </Button>
          </form>
        </div>

        <section className="space-y-4">
          <form action={createProject} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]">
            <input
              name="name"
              placeholder="Project name"
              className="h-8 rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              name="description"
              placeholder="Description"
              className="h-8 rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit">
              Create project
            </Button>
          </form>

          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6">
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} href={`/dashboard/projects/${project.id}`} />
              ))}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}

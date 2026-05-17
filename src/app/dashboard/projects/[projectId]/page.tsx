import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequirementCard } from "@/components/requirements/requirement-card";
import { buttonVariants } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Requirement = Database["public"]["Tables"]["requirements"]["Row"];

async function createRequirement(formData: FormData) {
  "use server";

  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!projectId || !title) {
    redirect(`/dashboard/projects/${projectId || ""}?error=missing-fields`);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { error } = await supabase.from("requirements").insert({
    project_id: projectId,
    owner_id: data.user.id,
    title,
    description: description || null,
  });

  if (error) {
    redirect(`/dashboard/projects/${projectId}?error=create-requirement`);
  }

  redirect(`/dashboard/projects/${projectId}`);
}

export default async function ProjectRequirementsPage({
  params,
}: Readonly<{
  params: Promise<{ projectId: string }>;
}>) {
  const { projectId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const [{ data: project }, requirementsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("requirements")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  if (!project || !user || project.owner_id !== user.id) {
    notFound();
  }

  const requirements = (requirementsResult.data ?? []) as Requirement[];

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Link className={buttonVariants({ variant: "ghost", size: "sm" }) + " px-2"} href="/dashboard">
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Requirements</p>
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            </div>
          </div>
        </div>

        <form
          action={createRequirement}
          className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <input
            name="title"
            placeholder="Requirement title"
            className="h-8 rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            name="description"
            placeholder="Description"
            className="h-8 rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit">
            <Plus className="size-4" />
            Add requirement
          </Button>
        </form>

        {requirements.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6">
            <p className="text-sm text-muted-foreground">No requirements yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {requirements.map((requirement) => (
              <RequirementCard key={requirement.id} requirement={requirement} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

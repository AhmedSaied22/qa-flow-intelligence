import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PlatformBadges } from "@/components/requirements/platform-badges";
import { RequirementAnalysisPanel } from "@/components/requirements/requirement-analysis-panel";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultRequirementPlatforms } from "@/lib/ai/prompts/requirement-analysis/v1";

export default async function RequirementPage({
  params,
}: Readonly<{
  params: Promise<{ projectId: string; requirementId: string }>;
}>) {
  const { projectId, requirementId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    notFound();
  }

  const [{ data: project }, { data: requirement }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("requirements").select("*").eq("id", requirementId).maybeSingle(),
  ]);

  if (!project || !requirement || project.owner_id !== userData.user.id || requirement.owner_id !== userData.user.id) {
    notFound();
  }

  return (
    <AppShell>
      <section className="space-y-6">
        <Link className={buttonVariants({ variant: "ghost", size: "sm" }) + " px-2"} href={`/dashboard/projects/${projectId}`}>
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Requirement</p>
          <h1 className="text-2xl font-semibold tracking-tight">{requirement.title}</h1>
          <p className="text-sm text-muted-foreground">{requirement.description || "No description yet."}</p>
        </div>

        <PlatformBadges platforms={getDefaultRequirementPlatforms(requirement)} />

        <RequirementAnalysisPanel
          requirementId={requirement.id}
          projectId={project.id}
          defaultPlatforms={getDefaultRequirementPlatforms(requirement)}
        />
      </section>
    </AppShell>
  );
}

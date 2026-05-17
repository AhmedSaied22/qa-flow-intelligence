import { ClipboardList } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type Requirement = Database["public"]["Tables"]["requirements"]["Row"];

type RequirementCardProps = {
  requirement: Requirement;
  projectId: string;
};

export function RequirementCard({ requirement, projectId }: RequirementCardProps) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{requirement.title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {requirement.description || "No description yet."}
        </p>
        </div>
        <Link
          className={buttonVariants({ variant: "outline", size: "sm" })}
          href={`/dashboard/projects/${projectId}/requirements/${requirement.id}`}
        >
          Analyze
        </Link>
      </div>
    </article>
  );
}

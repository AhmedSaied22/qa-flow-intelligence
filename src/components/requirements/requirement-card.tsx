import { ClipboardList } from "lucide-react";

import type { Database } from "@/lib/supabase/database.types";

type Requirement = Database["public"]["Tables"]["requirements"]["Row"];

type RequirementCardProps = {
  requirement: Requirement;
};

export function RequirementCard({ requirement }: RequirementCardProps) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{requirement.title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {requirement.description || "No description yet."}
        </p>
      </div>
    </article>
  );
}

import { FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">{project.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.description || "No description yet."}
          </p>
        </div>

        <Button variant="outline" size="sm" disabled>
          Open
        </Button>
      </div>
    </article>
  );
}

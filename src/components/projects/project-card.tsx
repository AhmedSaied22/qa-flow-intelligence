import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

type ProjectCardProps = {
  project: Project;
  href: string;
};

export function ProjectCard({ project, href }: ProjectCardProps) {
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

        <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={href}>
          Open
        </Link>
      </div>
    </article>
  );
}

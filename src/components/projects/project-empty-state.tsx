import { FolderPlus } from "lucide-react";

export function ProjectEmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-6">
      <div className="max-w-md space-y-3">
        <div className="flex items-center gap-2">
          <FolderPlus className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">No projects yet</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Create your first project to start organizing QA work.
        </p>
      </div>
    </div>
  );
}

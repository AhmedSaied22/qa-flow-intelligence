import { Badge } from "@/components/ui/badge";
import type { PlatformKind } from "@/lib/platform/types";

type PlatformBadgesProps = {
  platforms: PlatformKind[];
};

export function PlatformBadges({ platforms }: PlatformBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => (
        <Badge key={platform} variant="secondary" className="rounded-md">
          {platform === "web" ? "Web" : "Mobile"}
        </Badge>
      ))}
    </div>
  );
}

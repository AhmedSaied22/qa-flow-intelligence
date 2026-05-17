"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { PlatformKind } from "@/lib/platform/types";

type PlatformSelectorProps = {
  value: PlatformKind[];
  onChange: (value: PlatformKind[]) => void;
};

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(platform: PlatformKind) {
    const next = new Set(selected);
    if (next.has(platform)) {
      next.delete(platform);
    } else {
      next.add(platform);
    }
    onChange([...next]);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={selected.has("web") ? "default" : "outline"}
        size="sm"
        onClick={() => toggle("web")}
      >
        Web
      </Button>
      <Button
        type="button"
        variant={selected.has("mobile") ? "default" : "outline"}
        size="sm"
        onClick={() => toggle("mobile")}
      >
        Mobile
      </Button>
    </div>
  );
}

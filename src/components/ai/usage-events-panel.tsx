"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { AiUsageEventRow } from "@/lib/ai/provider-settings";

type GenerationMap = Record<
  string,
  {
    generation_type?: string | null;
    model?: string | null;
    status?: string | null;
    token_input?: number | null;
    token_output?: number | null;
    response_time_ms?: number | null;
    error_message?: string | null;
    error_code?: string | null;
  }
>;

type UsageEventsPanelProps = {
  events: AiUsageEventRow[];
  generationMap: GenerationMap;
};

export function UsageEventsPanel({ events, generationMap }: UsageEventsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failure">("all");
  const [operationFilter, setOperationFilter] = useState<string>("all");

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const generation = generationMap[event.ai_generation_id ?? ""];
        const status = generation?.status === "success" || event.cache_hit ? "success" : "failure";
        const operation = generation?.generation_type ?? event.source;
        const statusMatches = statusFilter === "all" || status === statusFilter;
        const operationMatches = operationFilter === "all" || operation === operationFilter;
        return statusMatches && operationMatches;
      }),
    [events, generationMap, operationFilter, statusFilter],
  );

  const operationOptions = useMemo(
    () =>
      Array.from(
        new Set(events.map((event) => generationMap[event.ai_generation_id ?? ""]?.generation_type ?? event.source)),
      ),
    [events, generationMap],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "success" | "failure")}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
        <select
          value={operationFilter}
          onChange={(event) => setOperationFilter(event.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="all">All operations</option>
          {operationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No usage events match the current filters.</p>
        ) : (
          filteredEvents.map((event) => {
            const generation = generationMap[event.ai_generation_id ?? ""];
            const status = generation?.status === "success" || event.cache_hit ? "success" : "failure";
            const operation = generation?.generation_type ?? event.source;
            const failureReason = generation?.error_message;
            const model = generation?.model ?? event.model;

            return (
              <div key={event.id} className="rounded-md border px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{event.provider}</p>
                      <Badge variant={status === "success" ? "secondary" : "default"} className="rounded-full">
                        {status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">Model: {model}</p>
                    <p className="text-muted-foreground">Operation: {operation}</p>
                    <p className="text-muted-foreground">Timestamp: {new Date(event.created_at).toLocaleString()}</p>
                    {failureReason ? <p className="text-xs text-destructive">{failureReason}</p> : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Tokens in: {generation?.token_input ?? event.tokens_in}</p>
                    <p>Tokens out: {generation?.token_output ?? event.tokens_out}</p>
                    <p>Response: {generation?.response_time_ms ?? event.response_time_ms ?? 0} ms</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

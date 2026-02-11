"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function LabelWithTooltip({
  htmlFor,
  label,
  tooltip,
  className,
}: {
  htmlFor?: string;
  label: React.ReactNode;
  tooltip: string;
  className?: string;
}) {
  if (!tooltip.trim()) {
    return (
      <Label htmlFor={htmlFor} className={className}>
        {label}
      </Label>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className={className}>
        {label}
      </Label>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex size-4 shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2"
            aria-label="More info"
          >
            <Info className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-left">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

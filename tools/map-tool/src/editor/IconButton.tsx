import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function IconButton({
  label,
  children,
  active,
  tooltipSide = "bottom",
  ...props
}: React.ComponentProps<typeof Button> & { label: string; active?: boolean; tooltipSide?: "top" | "right" | "bottom" | "left" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={active ? "secondary" : "ghost"}
          aria-label={label}
          className={active ? "tool-active" : ""}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}

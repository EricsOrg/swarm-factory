import * as React from "react";

import { Badge } from "@/components/ui/badge";

export type StatusKind = "PENDING" | "ACCEPTED" | "REJECTED" | "ERROR" | string;

function statusToVariant(status: StatusKind): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "ACCEPTED":
      return "success";
    case "REJECTED":
      return "danger";
    case "ERROR":
      return "danger";
    case "PENDING":
    default:
      return "secondary";
  }
}

export function StatusChip({ status, className }: { status: StatusKind; className?: string }) {
  return (
    <Badge className={className} variant={statusToVariant(status)}>
      {String(status)}
    </Badge>
  );
}

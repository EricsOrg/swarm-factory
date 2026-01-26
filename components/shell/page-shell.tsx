import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PageShell({
  title,
  description,
  backHref,
  backLabel = "Back",
  children,
  size = "md",
  className,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const maxW =
    size === "sm" ? "max-w-2xl" : size === "lg" ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className={cn("mx-auto w-full px-4 py-10", maxW)}>
        <Card>
          <CardHeader className="space-y-2">
            {backHref ? (
              <Link
                href={backHref}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← {backLabel}
              </Link>
            ) : null}
            <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

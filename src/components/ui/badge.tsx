import type * as React from "react"
import { cn } from "cn"

const base =
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3!"

const variants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
}

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: keyof typeof variants }) {
  return <span data-slot="badge" className={cn(base, variants[variant], className)} {...props} />
}

export { Badge }

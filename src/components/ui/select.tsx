import * as React from "react"
import { cn } from "@/lib/utils"
import { selectClassName } from "@/lib/ui"

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(selectClassName, className)}
      {...props}
    />
  )
}

export { Select }

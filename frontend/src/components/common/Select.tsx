import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  ComponentPropsWithoutRef<"select">
>(function Select({ className = "", ...props }, ref) {
  return <select ref={ref} className={`field ${className}`.trim()} {...props} />;
});

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input">
>(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`field ${className}`.trim()} {...props} />;
});

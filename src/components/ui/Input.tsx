import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { inputClassName, inputErrorClassName } from "./formStyles";

function join(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type WithInvalid = { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & WithInvalid>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={join(inputClassName, invalid && inputErrorClassName, className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & WithInvalid>(
  function Select({ className, invalid, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={join(inputClassName, invalid && inputErrorClassName, className)}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & WithInvalid>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={join(inputClassName, "py-2.5", invalid && inputErrorClassName, className)}
        {...props}
      />
    );
  },
);

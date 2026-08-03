import type { ComponentChildren, JSX } from "preact";
import { Input } from "@kamod-ch/ui/input";
import { Label } from "@kamod-ch/ui/label";
import { Button } from "@kamod-ch/ui/button";

export type FieldErrors = Record<string, string[] | undefined>;

export interface FormFieldProps {
  name: string;
  label: string;
  type?: JSX.InputHTMLAttributes<HTMLInputElement>["type"];
  defaultValue?: string;
  errors?: string[];
  description?: string;
  required?: boolean;
}

/** Single field wired to Otok validation `fieldErrors`. */
export function FormField({
  name,
  label,
  type = "text",
  defaultValue = "",
  errors,
  description,
  required,
}: FormFieldProps) {
  const invalid = Boolean(errors?.length);

  return (
    <div class="grid gap-2">
      <Label for={name}>{label}</Label>
      {description ? <p class="text-sm text-muted-foreground">{description}</p> : null}
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${name}-error` : undefined}
      />
      {errors?.map((error) => (
        <p key={error} id={`${name}-error`} role="alert" class="text-sm text-destructive">
          {error}
        </p>
      ))}
    </div>
  );
}

export interface FormAlertProps {
  message?: string;
}

export function FormAlert({ message }: FormAlertProps) {
  if (!message) return null;
  return (
    <p role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export interface FormActionsProps {
  children?: ComponentChildren;
  submitLabel?: string;
  cancelHref?: string;
  pending?: boolean;
}

export function FormActions({ children, submitLabel = "Save", cancelHref, pending }: FormActionsProps) {
  return (
    <div class="flex flex-wrap items-center gap-3">
      {children ?? (
        <>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
          {cancelHref ? (
            <a href={cancelHref} class="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </a>
          ) : null}
        </>
      )}
    </div>
  );
}

export interface OtokFormFailure {
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
}

export function readFormFailure(actionData: unknown): OtokFormFailure | undefined {
  if (!actionData || typeof actionData !== "object") return undefined;
  return actionData as OtokFormFailure;
}

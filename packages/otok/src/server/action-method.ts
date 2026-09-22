export type ActionMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export function resolveActionMethod(method: string, formData: FormData | undefined): ActionMethod {
  const override = formData?.get("_method");
  const candidate = typeof override === "string" ? override.toUpperCase() : method.toUpperCase();
  if (candidate === "PUT" || candidate === "PATCH" || candidate === "DELETE") return candidate;
  return "POST";
}

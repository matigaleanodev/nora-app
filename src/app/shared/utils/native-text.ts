/** Acepta texto directo y eventos nativos; un evento sin texto no borra el valor vigente. */
export function readNativeText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  if ("nativeEvent" in value) return readNativeText(value.nativeEvent);
  if ("text" in value && typeof value.text === "string") return value.text;
  return null;
}

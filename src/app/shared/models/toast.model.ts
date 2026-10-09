export type ToastVariant = "success" | "warning" | "danger";
export interface Toast {
  readonly message: string;
  readonly variant: ToastVariant;
}
export interface ToastOptions {
  /** Cero mantiene el aviso visible hasta cerrarlo manualmente. */
  readonly durationMs?: number;
}

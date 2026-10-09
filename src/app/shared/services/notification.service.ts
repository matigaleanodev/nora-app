import { Injectable, signal, type OnDestroy } from "@angular/core";
import type { Toast, ToastOptions, ToastVariant } from "../models/toast.model";

const DEFAULT_DURATION_MS = 5000;

/** Muestra un solo aviso global: cada mensaje nuevo reemplaza al anterior. */
@Injectable({ providedIn: "root" })
export class NotificationService implements OnDestroy {
  private readonly state = signal<Toast | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  readonly toast = this.state.asReadonly();

  success(message: string, options?: ToastOptions): void {
    this.show("success", message, options);
  }
  warning(message: string, options?: ToastOptions): void {
    this.show("warning", message, options);
  }
  danger(message: string, options?: ToastOptions): void {
    this.show("danger", message, options);
  }

  dismiss(): void {
    this.clearTimer();
    this.state.set(null);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private show(
    variant: ToastVariant,
    message: string,
    options?: ToastOptions,
  ): void {
    if (!message.trim()) return;
    // Los errores y advertencias permanecen visibles por defecto para dar tiempo a leerlos.
    const duration =
      options?.durationMs ?? (variant === "success" ? DEFAULT_DURATION_MS : 0);
    this.clearTimer();
    this.state.set({ variant, message: message.trim() });
    if (Number.isFinite(duration) && duration > 0) {
      this.timer = setTimeout(() => this.dismiss(), duration);
    }
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}

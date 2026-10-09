import { computed, inject, Injectable, signal } from "@angular/core";
import { LocalStorageService } from "../../core/storage/local-storage.service";

import { NotificationService } from "../../shared/services/notification.service";

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly category: string;
  readonly done: boolean;
}

const EXAMPLE_TASKS: readonly Task[] = [
  {
    id: "estimate",
    title: "Preparar presupuesto",
    detail: "Reparación de cocina · María López",
    category: "Presupuesto",
    done: false,
  },
  {
    id: "visit",
    title: "Confirmar visita",
    detail: "Instalación de luminarias · Carlos Ruiz",
    category: "Visita",
    done: false,
  },
  {
    id: "follow-up",
    title: "Consultar una respuesta",
    detail: "Pintura de living · Ana García",
    category: "Seguimiento",
    done: false,
  },
];

@Injectable({ providedIn: "root" })
export class TasksService {
  private readonly storage = inject(LocalStorageService);
  private readonly notifications = inject(NotificationService);
  private readonly state = signal<readonly Task[]>(EXAMPLE_TASKS);
  readonly tasks = this.state.asReadonly();
  readonly pending = computed(
    () => this.tasks().filter((task) => !task.done).length,
  );
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal("");

  constructor() {
    void this.load();
  }

  async toggle(id: string): Promise<void> {
    if (this.loading() || this.saving()) return;
    this.saving.set(true);
    this.error.set("");
    const next = this.tasks().map((task) =>
      task.id === id ? { ...task, done: !task.done } : task,
    );
    try {
      await this.storage.write("preview.tasks.v1", next);
      // Refleja el cambio sólo después de guardarlo para no mostrar un éxito falso.
      this.state.set(next);
      this.notifications.success(
        next.find((task) => task.id === id)?.done
          ? "Tarea completada."
          : "Tarea marcada como pendiente.",
      );
    } catch {
      this.error.set("No pudimos guardar el cambio. Volvé a intentarlo.");
      this.notifications.danger(this.error());
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      const saved =
        await this.storage.read<readonly Task[]>("preview.tasks.v1");
      if (saved) this.state.set(saved);
    } catch {
      this.error.set(
        "No pudimos leer los datos locales. Podés volver a abrir la app para reintentar.",
      );
      this.notifications.warning(this.error());
    } finally {
      this.loading.set(false);
    }
  }
}

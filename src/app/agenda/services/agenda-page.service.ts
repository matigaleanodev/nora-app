import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from "@angular/core";
import { Dialogs, HardwareBack, Keyboard } from "@ng-native/device";
import type { Customer } from "../../customers/models/customer.model";
import { CustomersService } from "../../customers/services/customers.service";
import { NotificationService } from "../../shared/services/notification.service";
import { calendarDateFromLocal } from "../../shared/utils/calendar-date";
import {
  VisitKind,
  VisitStatus,
  type Visit,
  type VisitForm,
  type VisitInput,
} from "../models/visit.model";
import { groupVisits } from "../utils/visit-format";
import { VisitRemindersService } from "./visit-reminders.service";
import { VisitsService } from "./visits.service";

type Screen = "list" | "form" | "customer";
const emptyForm = (date: string): VisitForm => ({
  title: "",
  kind: VisitKind.Visit,
  date,
  time: "",
  customerId: "",
  customerName: "",
  estimateId: "",
  estimateNumber: "",
  notes: "",
});
const toForm = (visit: Visit): VisitForm => ({
  title: visit.title,
  kind: visit.kind,
  date: visit.date,
  time: visit.time ?? "",
  customerId: visit.customerId ?? "",
  customerName: visit.customerName ?? "",
  estimateId: visit.estimateId ?? "",
  estimateNumber: visit.estimateNumber ?? "",
  notes: visit.notes ?? "",
});
const toInput = (form: VisitForm): VisitInput => ({
  title: form.title,
  kind: form.kind,
  date: form.date,
  time: form.time || undefined,
  customerId: form.customerId || undefined,
  customerName: form.customerName || undefined,
  estimateId: form.estimateId || undefined,
  estimateNumber: form.estimateNumber || undefined,
  notes: form.notes || undefined,
});

/** Coordina la agenda con signals; el servicio de dominio valida y persiste y los avisos son complementarios. */
@Injectable({ providedIn: "root" })
export class AgendaPageService {
  private readonly visits = inject(VisitsService);
  private readonly reminders = inject(VisitRemindersService);
  private readonly customerService = inject(CustomersService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(Dialogs);
  private readonly keyboard = inject(Keyboard);
  private readonly hardwareBack = inject(HardwareBack);
  private readonly shown = signal(false);
  private readonly screenState = signal<Screen>("list");
  private readonly records = signal<readonly Visit[]>([]);
  private readonly customers = signal<readonly Customer[]>([]);
  private readonly formState = signal<VisitForm>(emptyForm(""));
  private readonly baseline = signal("");
  private readonly editingId = signal<string | null>(null);
  private readonly reading = signal(false);
  private inflight: Promise<void> | null = null;
  private readonly working = signal(false);
  private readonly errorState = signal("");
  private readonly day = signal(calendarDateFromLocal(new Date()));
  readonly visible = this.shown.asReadonly();
  readonly screen = this.screenState.asReadonly();
  readonly form = this.formState.asReadonly();
  readonly today = this.day.asReadonly();
  readonly loading = this.reading.asReadonly();
  readonly busy = this.working.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly editing = computed(() => this.editingId() !== null);
  readonly search = signal("");
  readonly showDone = signal(false);
  readonly groups = computed(() => groupVisits(this.records(), this.day()));
  readonly sections = computed(() => {
    const groups = this.groups();
    return [
      { key: "overdue", title: "Vencidas", items: groups.overdue },
      { key: "today", title: "Hoy", items: groups.today },
      { key: "upcoming", title: "Próximas", items: groups.upcoming },
      ...(this.showDone()
        ? [{ key: "done", title: "Hechas", items: groups.done }]
        : []),
    ].filter((section) => section.items.length > 0);
  });
  readonly hasDone = computed(() => this.groups().done.length > 0);
  readonly title = computed(() =>
    this.screen() === "list"
      ? "Agenda"
      : this.screen() === "customer"
        ? "Elegir cliente"
        : this.editing()
          ? "Editar visita"
          : "Nueva visita",
  );
  readonly dirty = computed(
    () =>
      this.screen() !== "list" &&
      JSON.stringify(this.form()) !== this.baseline(),
  );
  readonly customerOptions = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.customers().filter(
      (customer) =>
        !customer.archived && customer.name.toLocaleLowerCase().includes(query),
    );
  });

  /** Abre la agenda; con datos previos (por ejemplo desde un presupuesto) abre directo el formulario. */
  async open(prefill?: Partial<VisitForm>): Promise<void> {
    if (!this.visible()) {
      this.shown.set(true);
      this.screenState.set("list");
      await this.load();
    }
    if (prefill) this.create(prefill);
  }
  /**
   * Abre una visita concreta, por ejemplo al tocar su aviso. Si hay cambios sin guardar pide la misma
   * confirmación que Atrás; si el usuario sigue editando, el formulario y la pantalla no cambian y
   * devuelve false.
   */
  async openVisit(id: string): Promise<boolean> {
    if (this.busy()) return false;
    if (this.visible() && !(await this.confirmDiscard())) return false;
    this.shown.set(true);
    this.screenState.set("list");
    await this.load();
    // La carga es asíncrona: si mientras tanto se abrió otro formulario con cambios, no se pisa sin confirmar.
    if (!(await this.confirmDiscard())) return false;
    const visit = this.records().find((value) => value.id === id);
    if (visit) this.edit(visit);
    // Si la carga falló la agenda ya muestra su error: no se puede afirmar que la visita no exista.
    else if (!this.error())
      this.notifications.warning("Esa visita ya no está en tu agenda.");
    return true;
  }
  /** Carga la agenda; si ya hay una lectura en curso comparte su resultado en vez de omitirla. */
  load(): Promise<void> {
    if (this.busy()) return Promise.resolve();
    return (this.inflight ??= this.read().finally(
      () => (this.inflight = null),
    ));
  }
  private async read(): Promise<void> {
    this.reading.set(true);
    this.errorState.set("");
    try {
      this.day.set(calendarDateFromLocal(new Date()));
      await this.reminders.reconcile();
      this.records.set(await this.visits.getAll());
    } catch {
      this.errorState.set("No pudimos cargar tu agenda. Volvé a intentarlo.");
    } finally {
      this.reading.set(false);
    }
  }
  create(prefill: Partial<VisitForm> = {}): void {
    this.editingId.set(null);
    this.startForm({ ...emptyForm(this.today()), ...prefill });
  }
  edit(visit: Visit): void {
    this.editingId.set(visit.id);
    this.startForm(toForm(visit));
  }
  update(changes: Partial<VisitForm>): void {
    if (!this.busy())
      this.formState.update((form) => ({ ...form, ...changes }));
  }
  chooseCustomer(): void {
    if (this.busy()) return;
    this.search.set("");
    this.screenState.set("customer");
    void this.loadCustomers();
  }
  pickCustomer(customer: Customer | null): void {
    this.update(
      customer
        ? { customerId: customer.id, customerName: customer.name }
        : { customerId: "", customerName: "" },
    );
    this.screenState.set("form");
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    this.working.set(true);
    this.errorState.set("");
    try {
      const id = this.editingId();
      const input = toInput(this.form());
      const saved = id
        ? await this.visits.update(id, input)
        : await this.visits.create(input);
      await this.reschedule(saved);
      this.records.set(await this.visits.getAll());
      this.keyboard.dismiss();
      this.screenState.set("list");
      this.notifications.success("Visita guardada.");
    } catch (error) {
      this.fail(error, "No pudimos guardar la visita.");
    } finally {
      this.working.set(false);
    }
  }
  async toggleDone(visit: Visit): Promise<void> {
    if (this.busy()) return;
    this.working.set(true);
    try {
      const done = visit.status === VisitStatus.Pending;
      const saved = await this.visits.setStatus(
        visit.id,
        done ? VisitStatus.Done : VisitStatus.Pending,
      );
      await this.reschedule(saved);
      this.records.set(await this.visits.getAll());
    } catch (error) {
      this.fail(error, "No pudimos actualizar la visita.");
    } finally {
      this.working.set(false);
    }
  }
  async remove(): Promise<void> {
    const id = this.editingId();
    const visit = this.records().find((value) => value.id === id);
    if (!visit || this.busy()) return;
    this.working.set(true);
    try {
      if (
        !(await this.dialogs.confirm(`¿Eliminar "${visit.title}"?`, {
          message: "Esta acción no se puede deshacer.",
          confirm: "Eliminar",
          cancel: "Cancelar",
          destructive: true,
        }))
      )
        return;
      await this.visits.remove(visit.id);
      await this.reminders.cancel(visit.id);
      this.records.set(await this.visits.getAll());
      this.screenState.set("list");
      this.notifications.success("Visita eliminada.");
    } catch (error) {
      this.fail(error, "No pudimos eliminar la visita.");
    } finally {
      this.working.set(false);
    }
  }
  async back(): Promise<void> {
    if (this.busy() || this.loading()) return;
    if (this.screen() === "customer") {
      this.screenState.set("form");
      return;
    }
    if (this.screen() === "form") {
      if (!(await this.confirmDiscard())) return;
      this.keyboard.dismiss();
      this.errorState.set("");
      this.screenState.set("list");
      return;
    }
    this.shown.set(false);
  }
  bindBack(destroy: DestroyRef): void {
    destroy.onDestroy(
      this.hardwareBack.handle(() => {
        void this.back();
        return true;
      }),
    );
  }
  /** Ajusta los avisos programados a las visitas guardadas, sin abrir la agenda ni pedir permisos. */
  async syncReminders(): Promise<void> {
    await this.reminders.reconcile();
  }
  /** Escucha los toques en avisos y delega en `open` (el shell decide cómo mostrar la visita); sin el módulo nativo la agenda sigue igual. */
  async bindNotifications(
    destroy: DestroyRef,
    open: (visitId: string) => void = (id) => void this.openVisit(id),
  ): Promise<void> {
    void this.syncReminders();
    try {
      const stop = await this.reminders.onOpen(open);
      destroy.onDestroy(stop);
    } catch {
      /* Expo Go o un build sin notificaciones: no hay avisos que abrir. */
    }
  }

  /** true si no hay cambios sin guardar o el usuario acepta descartarlos. */
  private async confirmDiscard(): Promise<boolean> {
    if (!this.dirty()) return true;
    return this.dialogs.confirm("¿Descartar cambios?", {
      message: "Los datos sin guardar se perderán.",
      confirm: "Descartar",
      cancel: "Seguir editando",
      destructive: true,
    });
  }
  private startForm(form: VisitForm): void {
    this.formState.set(form);
    this.baseline.set(JSON.stringify(form));
    this.errorState.set("");
    this.screenState.set("form");
  }
  private async loadCustomers(): Promise<void> {
    try {
      this.customers.set(await this.customerService.getAll());
    } catch {
      this.errorState.set("No pudimos cargar los clientes.");
    }
  }
  /** Deja el aviso acorde a la visita; si falla, la visita queda guardada y se avisa al usuario. */
  private async reschedule(visit: Visit): Promise<void> {
    try {
      const result = await this.reminders.schedule(visit);
      const marker = result.id ?? null;
      if (marker !== (visit.reminderId ?? null))
        await this.visits.setReminders({ [visit.id]: marker });
      if (result.denied)
        this.notifications.warning(
          "Guardamos la visita, pero no podemos avisarte: las notificaciones de Nora están desactivadas.",
        );
    } catch {
      // El aviso anterior ya se quitó: la marca guardada dejó de ser cierta y la próxima conciliación reintenta.
      await this.visits.setReminders({ [visit.id]: null }).catch(() => {});
      this.notifications.warning(
        "Guardamos la visita, pero no pudimos programar el aviso.",
      );
    }
  }
  private fail(error: unknown, fallback: string): void {
    const message =
      error instanceof Error && error.message ? error.message : fallback;
    this.errorState.set(message);
    this.notifications.danger(message);
  }
}

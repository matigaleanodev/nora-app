import {
  EstimateRecoveryService,
  type EstimateRecovery,
  type EstimateEditorRecovery,
} from "./estimate-recovery.service";
import { IdService } from "../../shared/services/id.service";
import type {
  EstimateItemRow,
  EstimateListRow,
} from "../models/estimate-view.model";
import {
  computed,
  isDevMode,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from "@angular/core";
import { Dialogs, HardwareBack, Keyboard } from "@ng-native/device";
import { EstimatesService } from "./estimates.service";
import { EstimatePdfService } from "./estimate-pdf.service";
import { CustomersService } from "../../customers/services/customers.service";
import type { Customer } from "../../customers/models/customer.model";
import { NotificationService } from "../../shared/services/notification.service";
import {
  parseMoneyInput,
  parseQuantityInput,
} from "../../shared/utils/decimal-input";
import {
  calculateEstimateTotal,
  calculateItemSubtotal,
} from "../utils/estimate-totals";
import {
  Currency,
  EstimateStatus,
  EstimateItemType,
  MeasurementUnit,
  type Estimate,
  type EstimateInput,
} from "../models/estimate.model";
import type {
  EstimateForm,
  EstimateItemForm,
} from "../models/estimate-form.model";

const emptyForm = (): EstimateForm => ({
  number: "",
  clientId: "",
  addressId: "",
  description: "",
  currency: Currency.ARS,
  validUntil: "",
  notes: "",
  items: [],
});
export const STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  accepted: "Aceptado",
  rejected: "Rechazado",
};
export const UNIT_OPTIONS = [
  { value: MeasurementUnit.Meter, label: "m" },
  { value: MeasurementUnit.SquareMeter, label: "m²" },
  { value: MeasurementUnit.CubicMeter, label: "m³" },
  { value: MeasurementUnit.Liter, label: "Litros" },
  { value: MeasurementUnit.Unit, label: "Unidades" },
  { value: MeasurementUnit.Hour, label: "Horas" },
  { value: MeasurementUnit.Job, label: "Trabajo" },
] as const;
/** Coordina la edición y el seguimiento; el servicio de dominio valida y persiste. */
@Injectable({ providedIn: "root" })
export class EstimatesPageService {
  private readonly recovery = inject(EstimateRecoveryService);
  private readonly ids = inject(IdService);
  private recoveryId: Promise<string> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private revision = 0;
  readonly recoveries = signal<readonly EstimateRecovery[]>([]);
  readonly saveState = signal<"idle" | "saving" | "saved" | "failed">("idle");
  readonly editor = signal<EstimateEditorRecovery | null>(null);
  readonly editorError = signal("");
  readonly editorVisible = signal(false);
  readonly activeEditor = computed(() =>
    this.editorVisible() ? this.editor() : null,
  );
  readonly saveLabel = computed(
    () =>
      ({
        idle: "Los cambios se guardan en este teléfono",
        saving: "Guardando…",
        saved: "Guardado en este teléfono",
        failed: "No pudimos guardar los cambios",
      })[this.saveState()],
  );
  readonly editorSubtotal = computed(() => {
    const editor = this.editor();
    if (!editor) return undefined;
    try {
      return calculateItemSubtotal(this.toItems([editor.item])[0]);
    } catch {
      return undefined;
    }
  });
  private readonly estimates = inject(EstimatesService);
  private readonly pdf = inject(EstimatePdfService);
  private readonly customers = inject(CustomersService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(Dialogs);
  private readonly keyboard = inject(Keyboard);
  private readonly hardwareBack = inject(HardwareBack);
  private readonly records = signal<readonly Estimate[]>([]);
  private readonly customerRecords = signal<readonly Customer[]>([]);
  private readonly screenState = signal<"list" | "detail" | "form">("list");
  private readonly selectedId = signal<string | null>(null);
  private readonly formState = signal<EstimateForm>(emptyForm());
  private readonly initialForm = signal("");
  private readonly working = signal(false);
  private readonly loadState = signal(false);
  private readonly errorState = signal("");
  readonly screen = this.screenState.asReadonly();
  readonly title = computed(() =>
    this.activeEditor()
      ? (this.editor()!.index === null ? "Agregar " : "Editar ") +
        (this.editor()!.item.type === EstimateItemType.Material
          ? "material"
          : "mano de obra")
      : this.screen() === "form"
        ? this.selected()
          ? "Editar presupuesto"
          : "Nuevo presupuesto"
        : this.screen() === "detail"
          ? "Detalle del presupuesto"
          : "Presupuestos",
  );
  readonly form = this.formState.asReadonly();
  readonly busy = this.working.asReadonly();
  readonly loading = this.loadState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly search = signal("");
  readonly statusFilter = signal<"all" | "draft" | "sent">("all");
  readonly choosingCustomer = signal(false);
  readonly customerSearch = signal("");
  readonly selected = computed(() =>
    this.records().find((estimate) => estimate.id === this.selectedId()),
  );
  readonly visibleRecoveries = computed(() =>
    this.statusFilter() === "sent"
      ? []
      : this.recoveries().filter((value) =>
          `${value.form.number} ${value.form.description}`
            .toLocaleLowerCase()
            .includes(this.search().trim().toLocaleLowerCase()),
        ),
  );
  readonly list = computed(() =>
    this.records().filter(
      (estimate) =>
        !this.recoveries().some(
          (value) =>
            value.estimateId === estimate.id &&
            estimate.status === EstimateStatus.Draft,
        ) &&
        (this.statusFilter() === "all" ||
          estimate.status === this.statusFilter()) &&
        `${estimate.number} ${estimate.customerSnapshot.name} ${estimate.description}`
          .toLocaleLowerCase()
          .includes(this.search().trim().toLocaleLowerCase()),
    ),
  );
  readonly customerChoices = computed(() =>
    this.customerRecords().filter(
      (customer) =>
        !customer.archived &&
        customer.name
          .toLocaleLowerCase()
          .includes(this.customerSearch().trim().toLocaleLowerCase()),
    ),
  );
  readonly currentCustomer = computed(() =>
    this.customerRecords().find(
      (customer) => customer.id === this.form().clientId,
    ),
  );
  readonly dirty = computed(
    () =>
      this.screen() === "form" &&
      JSON.stringify(this.form()) !== this.initialForm(),
  );
  readonly preview = computed(() => {
    try {
      const items = this.toItems(this.form().items);
      return {
        total: calculateEstimateTotal(items),
        subtotals: items.map(calculateItemSubtotal),
        error: "",
      };
    } catch (error: unknown) {
      return {
        total: null,
        subtotals: [],
        error: error instanceof Error ? error.message : "Revisá los importes.",
      };
    }
  });
  readonly viewKey = computed(
    () =>
      `${this.screen()}:${this.choosingCustomer() ? "picker" : this.activeEditor() ? "editor" : "content"}`,
  );
  readonly listRows = computed<readonly EstimateListRow[]>(() =>
    this.list().map((estimate) => ({
      estimate,
      totalCents: this.total(estimate),
    })),
  );
  readonly selectedTotal = computed(() =>
    this.selected() ? this.total(this.selected()!) : 0,
  );
  readonly detailItems = computed<readonly EstimateItemRow[]>(
    () =>
      this.selected()?.items.map((item) => ({
        item,
        subtotalCents: this.subtotal(item),
        unitLabel: this.unitLabel(item.unit),
      })) ?? [],
  );
  readonly statusLabels = STATUS_LABELS;
  readonly units = UNIT_OPTIONS;
  readonly currencies = [Currency.ARS, Currency.USD];
  readonly itemTypes = [
    { value: EstimateItemType.Material, label: "Material" },
    { value: EstimateItemType.Labor, label: "Mano de obra" },
  ];
  readonly nextStatuses = computed(() =>
    this.selected()?.status === EstimateStatus.Draft
      ? [EstimateStatus.Sent]
      : this.selected()?.status === EstimateStatus.Sent
        ? [EstimateStatus.Accepted, EstimateStatus.Rejected]
        : [],
  );
  bindBack(destroyRef: DestroyRef): void {
    destroyRef.onDestroy(
      this.hardwareBack.handle(() => {
        if (this.screen() === "list") return false;
        void this.back();
        return true;
      }),
    );
  }
  async enter(): Promise<void> {
    if (this.busy()) return;
    this.loadState.set(true);
    try {
      const [estimates, customers, recoveries] = await Promise.all([
        this.estimates.getAll(),
        this.customers.getAll(),
        this.recovery.getAll(),
      ]);
      this.records.set(estimates);
      this.recoveries.set(recoveries);
      this.customerRecords.set(customers);
      this.errorState.set("");
    } catch {
      this.errorState.set("No pudimos cargar los presupuestos y clientes.");
      this.notifications.danger(this.error());
    } finally {
      this.loadState.set(false);
    }
  }
  open(estimate: Estimate): void {
    const recovery = this.recoveries().find(
      (value) => value.estimateId === estimate.id,
    );
    if (recovery && estimate.status === EstimateStatus.Draft) {
      this.resume(recovery);
      return;
    }
    this.selectedId.set(estimate.id);
    this.screenState.set("detail");
    this.errorState.set("");
  }
  create(): void {
    this.selectedId.set(null);
    this.startForm(emptyForm());
  }
  edit(): void {
    const estimate = this.selected();
    if (!estimate || estimate.status !== EstimateStatus.Draft) return;
    this.startForm({
      number: estimate.number,
      clientId: estimate.clientId,
      addressId: estimate.customerSnapshot.address?.id ?? "",
      description: estimate.description,
      currency: estimate.currency,
      validUntil: estimate.validUntil ?? "",
      notes: estimate.notes ?? "",
      items: estimate.items.map((item) => ({
        ...item,
        quantity: String(item.quantity).replace(".", ","),
        price: (item.unitPriceCents / 100).toFixed(2).replace(".", ","),
      })),
    });
  }
  private patch<K extends keyof EstimateForm>(
    key: K,
    value: EstimateForm[K],
  ): void {
    if (!this.busy()) {
      this.formState.update((form) => ({ ...form, [key]: value }));
      this.persist();
    }
  }
  updateForm(changes: Partial<EstimateForm>): void {
    if (!this.busy()) {
      this.formState.update((form) => ({ ...form, ...changes }));
      this.persist();
    }
  }
  chooseCustomer(customer: Customer): void {
    if (this.busy()) return;
    this.formState.update((form) => ({
      ...form,
      clientId: customer.id,
      addressId: "",
    }));
    this.choosingCustomer.set(false);
    this.persist();
  }
  addItem(type: EstimateItemType = EstimateItemType.Material): void {
    if (this.busy()) return;
    if (this.editor()) {
      this.editorVisible.set(true);
      return;
    }
    this.editor.set({
      index: null,
      item: {
        description: "",
        type,
        quantity: "1",
        unit:
          type === EstimateItemType.Material
            ? MeasurementUnit.Unit
            : MeasurementUnit.Job,
        price: "",
      },
    });
    this.editorVisible.set(true);
    this.editorError.set("");
  }
  editItem(index: number): void {
    if (this.editor()) {
      this.editorVisible.set(true);
      return;
    }
    this.editor.set({ index, item: { ...this.form().items[index] } });
    this.editorVisible.set(true);
    this.editorError.set("");
  }
  updateEditor(changes: Partial<EstimateItemForm>): void {
    if (this.busy()) return;
    this.editor.update((editor) =>
      editor ? { ...editor, item: { ...editor.item, ...changes } } : null,
    );
    this.persist();
  }
  confirmItem(another = false): void {
    const editor = this.editor();
    if (!editor || this.busy()) return;
    try {
      if (!editor.item.description.trim())
        throw new Error(
          editor.item.type === EstimateItemType.Material
            ? "Completá el material."
            : "Completá el trabajo a realizar.",
        );
      this.toItems([editor.item]).forEach(calculateItemSubtotal);
      this.formState.update((form) => ({
        ...form,
        items:
          editor.index === null
            ? [...form.items, editor.item]
            : form.items.map((item, index) =>
                index === editor.index ? editor.item : item,
              ),
      }));
      this.editor.set(null);
      this.persist();
      if (another) this.addItem(editor.item.type);
    } catch (error) {
      this.editorError.set(
        error instanceof Error ? error.message : "Revisá el material o tarea.",
      );
    }
  }
  cancelItem(): void {
    this.editor.set(null);
    this.editorError.set("");
    this.persist();
  }
  async removeItem(index: number): Promise<void> {
    if (this.busy()) return;
    const item = this.form().items[index];
    if (
      !item ||
      !(await this.dialogs.confirm(
        item.type === EstimateItemType.Material
          ? "¿Eliminar material?"
          : "¿Eliminar tarea?",
        { confirm: "Eliminar", cancel: "Conservar", destructive: true },
      ))
    )
      return;
    this.editor.set(null);
    this.patch(
      "items",
      this.form().items.filter((_, position) => position !== index),
    );
  }
  resume(value: EstimateRecovery): void {
    // Si el proceso terminó entre guardar el documento y limpiar su recuperación,
    // el UUID estable permite retomar ese mismo documento sin volver a crearlo.
    const estimateId =
      value.estimateId ??
      (this.records().some((record) => record.id === value.id)
        ? value.id
        : null);
    if (
      estimateId &&
      !this.records().some(
        (record) =>
          record.id === estimateId && record.status === EstimateStatus.Draft,
      )
    ) {
      this.notifications.warning(
        "Esta edición pertenece a un presupuesto que ya no se puede editar.",
      );
      return;
    }
    this.selectedId.set(estimateId);
    this.startForm(value.form);
    this.recoveryId = Promise.resolve(value.id);
    this.editor.set(value.editor);
    this.editorVisible.set(!!value.editor);
    this.saveState.set("saved");
  }
  async deleteRecovery(value: EstimateRecovery): Promise<void> {
    if (
      !(await this.dialogs.confirm("¿Eliminar borrador incompleto?", {
        confirm: "Eliminar",
        cancel: "Conservar",
        destructive: true,
      }))
    )
      return;
    try {
      await this.recovery.remove(value.id);
      this.recoveries.update((records) =>
        records.filter((record) => record.id !== value.id),
      );
    } catch (error) {
      this.fail(error, "No pudimos eliminar el borrador.");
    }
  }
  private persist(): void {
    if (!this.dirty() && !this.editor() && !this.recoveryId) return;
    this.recoveryId ??= this.ids.create().catch((error) => {
      this.recoveryId = null;
      throw error;
    });
    const id = this.recoveryId;
    const form = structuredClone(this.form());
    const editor = structuredClone(this.editor());
    const estimateId = this.selectedId();
    const revision = ++this.revision;
    this.saveState.set("saving");
    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        const value: EstimateRecovery = {
          id: await id,
          estimateId,
          form,
          editor,
          updatedAt: new Date().toISOString(),
        };
        await this.recovery.save(value);
        this.recoveries.update((records) => [
          ...records.filter((record) => record.id !== value.id),
          value,
        ]);
        if (revision === this.revision) this.saveState.set("saved");
      })
      .catch(() => {
        if (revision === this.revision) this.saveState.set("failed");
      });
  }
  retrySave(): void {
    this.persist();
  }
  total(estimate: Estimate): number {
    return calculateEstimateTotal(estimate.items);
  }
  subtotal(item: Estimate["items"][number]): number {
    return calculateItemSubtotal(item);
  }
  unitLabel(unit: MeasurementUnit): string {
    return this.units.find((option) => option.value === unit)?.label ?? unit;
  }
  async back(): Promise<void> {
    if (this.busy()) return;
    if (this.choosingCustomer()) {
      this.choosingCustomer.set(false);
      return;
    }
    if (this.activeEditor()) {
      await this.writeQueue;
      if (this.saveState() === "failed") return;
      this.editorVisible.set(false);
      this.editorError.set("");
      return;
    }
    await this.writeQueue;
    if (this.saveState() === "failed") {
      this.notifications.danger(
        "No pudimos guardar los cambios. Reintentá antes de volver.",
      );
      return;
    }
    this.keyboard.dismiss();
    this.errorState.set("");
    this.screenState.set("list");
  }
  async save(): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.working.set(true);
    this.errorState.set("");
    try {
      await this.writeQueue;
      if (this.saveState() === "failed")
        throw new Error(
          "No pudimos guardar los cambios. Reintentá antes de revisar.",
        );
      if (this.editor())
        throw new Error(
          "Confirmá o cancelá el material o tarea pendiente antes de revisar.",
        );
      const form = this.form();
      if (!form.number.trim())
        throw new Error("Completá el número del presupuesto para revisarlo.");
      if (!form.clientId)
        throw new Error("Elegí un cliente para revisar el presupuesto.");
      if (!form.description.trim())
        throw new Error("Completá la descripción del trabajo para revisarlo.");
      const input: EstimateInput = {
        ...form,
        addressId: form.addressId || undefined,
        validUntil: form.validUntil || undefined,
        notes: (form.notes ?? "").trim() || undefined,
        items: this.toItems(form.items),
      };
      const id = this.selectedId();
      const saved = id
        ? await this.estimates.update(id, input)
        : await this.estimates.create(
            input,
            this.recoveryId ? await this.recoveryId : undefined,
          );
      this.records.update((records) => [
        ...records.filter((estimate) => estimate.id !== saved.id),
        saved,
      ]);
      this.selectedId.set(saved.id);
      const recoveryId = this.recoveryId ? await this.recoveryId : null;
      if (recoveryId) {
        await this.recovery.remove(recoveryId);
        this.recoveries.update((records) =>
          records.filter((record) => record.id !== recoveryId),
        );
      }
      this.recoveryId = null;
      this.initialForm.set(JSON.stringify(this.form()));
      this.screenState.set("detail");
      this.keyboard.dismiss();
    } catch (error: unknown) {
      this.fail(error, "No pudimos guardar el presupuesto.");
    } finally {
      this.working.set(false);
    }
  }
  async delete(): Promise<void> {
    const estimate = this.selected();
    if (!estimate || estimate.status !== EstimateStatus.Draft || this.busy())
      return;
    this.working.set(true);
    try {
      if (
        !(await this.dialogs.confirm(`¿Eliminar ${estimate.number}?`, {
          message: "Esta acción no se puede deshacer.",
          confirm: "Eliminar",
          cancel: "Cancelar",
          destructive: true,
        }))
      )
        return;
      await this.estimates.deleteDraft(estimate.id);
      this.records.update((records) =>
        records.filter((record) => record.id !== estimate.id),
      );
      this.screenState.set("list");
      this.errorState.set("");
      this.notifications.success("Borrador eliminado.");
    } catch (error: unknown) {
      this.fail(error, "No pudimos eliminar el presupuesto.");
    } finally {
      this.working.set(false);
    }
  }
  async sharePdf(): Promise<void> {
    const estimate = this.selected();
    if (!estimate || this.busy() || this.loading()) return;
    this.working.set(true);
    this.errorState.set("");
    try {
      await this.pdf.share(estimate);
    } catch (error: unknown) {
      this.fail(error, "No pudimos preparar o compartir el PDF.");
    } finally {
      this.working.set(false);
    }
  }
  async changeStatus(status: EstimateStatus): Promise<void> {
    const estimate = this.selected();
    if (!estimate || this.busy()) return;
    this.working.set(true);
    try {
      if (
        status === EstimateStatus.Sent &&
        !(await this.dialogs.confirm("¿Marcar como enviado?", {
          message:
            "El presupuesto quedará bloqueado para edición. Esto no envía mensajes ni comparte el PDF.",
          confirm: "Marcar enviado",
          cancel: "Cancelar",
        }))
      )
        return;
      await this.estimates.setStatus(estimate.id, status);
      this.records.update((records) =>
        records.map((record) =>
          record.id === estimate.id ? { ...record, status } : record,
        ),
      );
      this.errorState.set("");
      this.notifications.success("Estado actualizado.");
    } catch (error: unknown) {
      this.fail(error, "No pudimos cambiar el estado.");
    } finally {
      this.working.set(false);
    }
  }
  private toItems(items: readonly EstimateItemForm[]): EstimateInput["items"] {
    return items.map((item) => ({
      id: item.id,
      description: item.description,
      type: item.type,
      unit: item.unit,
      quantity: parseQuantityInput(item.quantity),
      unitPriceCents: parseMoneyInput(item.price),
    }));
  }
  private startForm(form: EstimateForm): void {
    this.recoveryId = null;
    this.editor.set(null);
    this.editorVisible.set(false);
    this.saveState.set("idle");
    this.formState.set(form);
    this.initialForm.set(JSON.stringify(form));
    this.screenState.set("form");
    this.choosingCustomer.set(false);
    this.customerSearch.set("");
    this.errorState.set("");
  }
  private fail(error: unknown, fallback: string): void {
    if (isDevMode()) console.error("No se pudo completar la operación.", error);
    this.errorState.set(error instanceof Error ? error.message : fallback);
    this.notifications.danger(this.error());
  }
}

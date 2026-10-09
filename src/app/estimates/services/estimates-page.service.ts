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
  private readonly estimates = inject(EstimatesService);
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
    this.screen() === "form"
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
  readonly choosingCustomer = signal(false);
  readonly customerSearch = signal("");
  readonly selected = computed(() =>
    this.records().find((estimate) => estimate.id === this.selectedId()),
  );
  readonly list = computed(() =>
    this.records().filter((estimate) =>
      `${estimate.number} ${estimate.customerSnapshot.name}`
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
    () => `${this.screen()}:${this.choosingCustomer() ? "picker" : "content"}`,
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
      const [estimates, customers] = await Promise.all([
        this.estimates.getAll(),
        this.customers.getAll(),
      ]);
      this.records.set(estimates);
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
    this.selectedId.set(estimate.id);
    this.screenState.set("detail");
    this.errorState.set("");
  }
  create(): void {
    if (!this.customerRecords().some((customer) => !customer.archived)) {
      this.notifications.warning(
        "Primero agregá un cliente activo desde Clientes.",
      );
      return;
    }
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
    if (!this.busy())
      this.formState.update((form) => ({ ...form, [key]: value }));
  }
  updateForm(changes: Partial<EstimateForm>): void {
    if (!this.busy())
      this.formState.update((form) => ({ ...form, ...changes }));
  }
  updateItem(
    index: number,
    changes: Partial<Omit<EstimateItemForm, "id">>,
  ): void {
    this.patch(
      "items",
      this.form().items.map((item, position) =>
        position === index ? { ...item, ...changes } : item,
      ),
    );
  }
  chooseCustomer(customer: Customer): void {
    if (this.busy()) return;
    this.formState.update((form) => ({
      ...form,
      clientId: customer.id,
      addressId: "",
    }));
    this.choosingCustomer.set(false);
  }
  addItem(): void {
    this.patch("items", [
      ...this.form().items,
      {
        description: "",
        type: EstimateItemType.Material,
        quantity: "1",
        unit: MeasurementUnit.Unit,
        price: "",
      },
    ]);
  }
  removeItem(index: number): void {
    this.patch(
      "items",
      this.form().items.filter((_, position) => position !== index),
    );
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
    if (
      this.dirty() &&
      !(await this.dialogs.confirm("¿Descartar cambios?", {
        message: "Los cambios sin guardar se perderán.",
        confirm: "Descartar",
        cancel: "Seguir editando",
        destructive: true,
      }))
    )
      return;
    this.keyboard.dismiss();
    this.errorState.set("");
    this.screenState.set(
      this.screen() === "form" && this.selected() ? "detail" : "list",
    );
  }
  async save(): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.working.set(true);
    this.errorState.set("");
    try {
      const form = this.form();
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
        : await this.estimates.create(input);
      this.records.update((records) => [
        ...records.filter((estimate) => estimate.id !== saved.id),
        saved,
      ]);
      this.selectedId.set(saved.id);
      this.screenState.set("detail");
      this.keyboard.dismiss();
      this.notifications.success("Presupuesto guardado.");
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
  async changeStatus(status: EstimateStatus): Promise<void> {
    const estimate = this.selected();
    if (!estimate || this.busy()) return;
    this.working.set(true);
    try {
      if (
        status === EstimateStatus.Sent &&
        !(await this.dialogs.confirm("¿Marcar como enviado?", {
          message:
            "El presupuesto quedará bloqueado para edición. Esto no envía mensajes ni genera un PDF.",
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

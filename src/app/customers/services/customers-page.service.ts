import {
  computed,
  isDevMode,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from "@angular/core";
import { Dialogs, HardwareBack, Keyboard } from "@ng-native/device";
import { CustomersService } from "./customers.service";
import { NotificationService } from "../../shared/services/notification.service";
import { type Customer, type CustomerInput } from "../models/customer.model";
import type { CustomerForm } from "../models/customer-form.model";

const emptyForm = (): CustomerForm => ({
  name: "",
  areaCode: "",
  phoneNumber: "",
  whatsapp: true,
  email: "",
  notes: "",
  addresses: [],
});
/** Coordina la UI con signals y conserva el formulario entre tabs durante la sesión. */
@Injectable({ providedIn: "root" })
export class CustomersPageService {
  private readonly customers = inject(CustomersService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(Dialogs);
  private readonly keyboard = inject(Keyboard);
  private readonly hardwareBack = inject(HardwareBack);
  private readonly records = signal<readonly Customer[]>([]);
  private readonly screenState = signal<"list" | "detail" | "form">("list");
  private readonly selectedId = signal<string | null>(null);
  private readonly formState = signal<CustomerForm>(emptyForm());
  private readonly initialForm = signal("");
  private readonly working = signal(false);
  private readonly loadState = signal(false);
  private readonly errorState = signal("");
  readonly screen = this.screenState.asReadonly();
  readonly title = computed(() =>
    this.screen() === "form"
      ? this.selected()
        ? "Editar cliente"
        : "Nuevo cliente"
      : this.screen() === "detail"
        ? "Detalle del cliente"
        : "Clientes",
  );
  readonly viewKey = this.screen;
  readonly form = this.formState.asReadonly();
  readonly busy = this.working.asReadonly();
  readonly loading = this.loadState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly search = signal("");
  readonly showArchived = signal(false);
  readonly selected = computed(() =>
    this.records().find((customer) => customer.id === this.selectedId()),
  );
  readonly list = computed(() =>
    this.records().filter(
      (customer) =>
        customer.archived === this.showArchived() &&
        `${customer.name} ${customer.phone?.number ?? ""}`
          .toLocaleLowerCase()
          .includes(this.search().trim().toLocaleLowerCase()),
    ),
  );
  readonly dirty = computed(
    () =>
      this.screen() === "form" &&
      JSON.stringify(this.form()) !== this.initialForm(),
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
      this.records.set(await this.customers.getAll());
      this.errorState.set("");
    } catch {
      this.errorState.set("No pudimos cargar los clientes.");
      this.notifications.danger(this.error());
    } finally {
      this.loadState.set(false);
    }
  }
  open(customer: Customer): void {
    this.selectedId.set(customer.id);
    this.screenState.set("detail");
    this.errorState.set("");
  }
  create(): void {
    this.selectedId.set(null);
    this.startForm(emptyForm());
  }
  edit(): void {
    const customer = this.selected();
    if (!customer) return;
    this.startForm({
      name: customer.name,
      areaCode: customer.phone?.areaCode ?? "",
      phoneNumber: customer.phone?.number ?? "",
      whatsapp: customer.phone?.whatsapp ?? true,
      email: customer.email ?? "",
      notes: customer.notes ?? "",
      addresses: customer.addresses,
    });
  }
  private patch<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K],
  ): void {
    if (!this.busy())
      this.formState.update((form) => ({ ...form, [key]: value }));
  }
  updateForm(changes: Partial<CustomerForm>): void {
    if (!this.busy())
      this.formState.update((form) => ({ ...form, ...changes }));
  }
  updateAddress(
    index: number,
    changes: Partial<Omit<CustomerInput["addresses"][number], "id">>,
  ): void {
    this.patch(
      "addresses",
      this.form().addresses.map((address, position) =>
        position === index ? { ...address, ...changes } : address,
      ),
    );
  }
  addAddress(address?: CustomerInput["addresses"][number]): void {
    this.patch("addresses", [
      ...this.form().addresses,
      address ?? {
        name: "",
        street: "",
        streetNumber: "",
        city: "",
        province: "",
        floor: "",
        apartment: "",
      },
    ]);
  }
  removeAddress(index: number): void {
    this.patch(
      "addresses",
      this.form().addresses.filter((_, position) => index !== position),
    );
  }
  async back(): Promise<void> {
    if (this.busy()) return;
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
      const input: CustomerInput = {
        name: form.name,
        email: (form.email ?? "").trim() || undefined,
        notes: (form.notes ?? "").trim() || undefined,
        phone:
          form.areaCode || form.phoneNumber
            ? {
                areaCode: form.areaCode.trim(),
                number: form.phoneNumber.trim(),
                whatsapp: form.whatsapp,
              }
            : undefined,
        addresses: form.addresses,
      };
      const id = this.selectedId();
      const saved = id
        ? await this.customers.update(id, input)
        : await this.customers.create(input);
      this.records.update((records) => [
        ...records.filter((customer) => customer.id !== saved.id),
        saved,
      ]);
      this.selectedId.set(saved.id);
      this.screenState.set("detail");
      this.keyboard.dismiss();
      this.notifications.success("Cliente guardado.");
    } catch (error: unknown) {
      this.fail(error, "No pudimos guardar el cliente.");
    } finally {
      this.working.set(false);
    }
  }
  async archive(): Promise<void> {
    const customer = this.selected();
    if (!customer || this.busy()) return;
    this.working.set(true);
    try {
      const label = customer.archived ? "Restaurar" : "Archivar";
      if (
        !(await this.dialogs.confirm(`¿${label} a ${customer.name}?`, {
          message: "Sus presupuestos se conservarán.",
          confirm: label,
          cancel: "Cancelar",
          destructive: !customer.archived,
        }))
      )
        return;
      await this.customers.setArchived(customer.id, !customer.archived);
      this.records.update((records) =>
        records.map((record) =>
          record.id === customer.id
            ? { ...record, archived: !customer.archived }
            : record,
        ),
      );
      this.screenState.set("list");
      this.errorState.set("");
      this.notifications.success(
        customer.archived ? "Cliente restaurado." : "Cliente archivado.",
      );
    } catch (error: unknown) {
      this.fail(error, "No pudimos actualizar el cliente.");
    } finally {
      this.working.set(false);
    }
  }
  private startForm(form: CustomerForm): void {
    this.formState.set(form);
    this.initialForm.set(JSON.stringify(form));
    this.screenState.set("form");
    this.errorState.set("");
  }
  private fail(error: unknown, fallback: string): void {
    if (isDevMode()) console.error("No se pudo completar la operación.", error);
    this.errorState.set(error instanceof Error ? error.message : fallback);
    this.notifications.danger(this.error());
  }
}

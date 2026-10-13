import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from "@angular/core";
import { Dialogs, HardwareBack, Keyboard } from "@ng-native/device";
import { BusinessProfileService } from "./business-profile.service";
import { BusinessLogoService } from "./business-logo.service";
import { NotificationService } from "../../shared/services/notification.service";
import type {
  BusinessForm,
  BusinessProfile,
} from "../models/business-profile.model";
const toForm = (profile: BusinessProfile | null): BusinessForm => ({
  displayName: profile?.displayName ?? "",
  email: profile?.email ?? "",
  areaCode: profile?.phone?.areaCode ?? "",
  phoneNumber: profile?.phone?.number ?? "",
  whatsapp: profile?.phone?.whatsapp ?? true,
  logo: profile?.logo,
});
@Injectable({ providedIn: "root" })
export class BusinessPageService {
  private readonly profiles = inject(BusinessProfileService);
  private readonly logos = inject(BusinessLogoService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(Dialogs);
  private readonly keyboard = inject(Keyboard);
  private readonly hardwareBack = inject(HardwareBack);
  private readonly shown = signal(false);
  private readonly formState = signal<BusinessForm>(toForm(null));
  private readonly baseline = signal("");
  private readonly working = signal(false);
  private readonly reading = signal(false);
  private readonly errorState = signal("");
  private readonly loadFailed = signal(false);
  readonly visible = this.shown.asReadonly();
  readonly form = this.formState.asReadonly();
  readonly busy = this.working.asReadonly();
  readonly loading = this.reading.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly blocked = computed(
    () => this.busy() || this.loading() || this.loadFailed(),
  );
  readonly dirty = computed(
    () => JSON.stringify(this.form()) !== this.baseline(),
  );
  async open(): Promise<void> {
    if (this.visible()) return;
    this.shown.set(true);
    await this.load();
  }
  async load(): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.reading.set(true);
    this.errorState.set("");
    this.loadFailed.set(false);
    try {
      const form = toForm(await this.profiles.get());
      this.formState.set(form);
      this.baseline.set(JSON.stringify(form));
    } catch {
      this.loadFailed.set(true);
      this.errorState.set("No pudimos cargar los datos de tu negocio.");
    } finally {
      this.reading.set(false);
    }
  }
  update(changes: Partial<BusinessForm>): void {
    if (!this.blocked())
      this.formState.update((form) => ({ ...form, ...changes }));
  }
  async pickLogo(): Promise<void> {
    if (this.blocked()) return;
    this.working.set(true);
    try {
      const logo = await this.logos.pick();
      if (logo) this.formState.update((form) => ({ ...form, logo }));
    } catch (error) {
      this.fail(error);
    } finally {
      this.working.set(false);
    }
  }
  async save(): Promise<void> {
    if (this.blocked()) return;
    this.working.set(true);
    this.errorState.set("");
    try {
      const saved = await this.profiles.save(this.form());
      const form = toForm(saved);
      this.formState.set(form);
      this.baseline.set(JSON.stringify(form));
      this.keyboard.dismiss();
      this.notifications.success("Datos de tu negocio guardados.");
    } catch (error) {
      this.fail(error);
    } finally {
      this.working.set(false);
    }
  }
  async close(): Promise<void> {
    if (this.busy() || this.loading()) return;
    if (
      !this.loadFailed() &&
      this.dirty() &&
      !(await this.dialogs.confirm("¿Descartar cambios?", {
        message: "Los datos sin guardar se perderán.",
        confirm: "Descartar",
        cancel: "Seguir editando",
        destructive: true,
      }))
    )
      return;
    this.keyboard.dismiss();
    this.shown.set(false);
  }
  bindBack(destroy: DestroyRef): void {
    destroy.onDestroy(
      this.hardwareBack.handle(() => {
        void this.close();
        return true;
      }),
    );
  }
  private fail(error: unknown): void {
    this.errorState.set(
      error instanceof Error
        ? error.message
        : "No pudimos guardar los datos del negocio.",
    );
    this.notifications.danger(this.error());
  }
}

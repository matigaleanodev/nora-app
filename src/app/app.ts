import { ShellService } from "./shared/services/shell.service";
import { NavigationRowComponent } from "./shared/components/navigation-row/navigation-row.component";
import { CustomersPageService } from "./customers/services/customers-page.service";
import { EstimatesPageService } from "./estimates/services/estimates-page.service";
import type { Estimate } from "./estimates/models/estimate.model";
import { PageLayoutComponent } from "./shared/components/page-layout/page-layout.component";
import { AgendaPageComponent } from "./agenda/pages/agenda-page.component";
import { AgendaPageService } from "./agenda/services/agenda-page.service";
import { BackupPageComponent } from "./backup/pages/backup-page.component";
import { BackupPageService } from "./backup/services/backup-page.service";
import { BusinessPageComponent } from "./business/pages/business-page.component";
import { BusinessPageService } from "./business/services/business-page.service";
import { AddressEditorService } from "./customers/services/address-editor.service";
import { IconComponent } from "./shared/components/icon/icon.component";
import {
  Component,
  inject,
  signal,
  computed,
  DestroyRef,
  effect,
  untracked,
} from "@angular/core";
import {
  Modal,
  Pressable,
  SafeAreaProvider,
  SafeAreaView,
  Text,
  View,
} from "@ng-native/components";
import { HardwareBack } from "@ng-native/device";
import { StatusBar } from "@ng-native/device";
import { HomeComponent } from "./features/home/home.component";

import { ToastComponent } from "./shared/components/toast/toast.component";

import { CustomersPageComponent } from "./customers/pages/customers-page.component";
import { EstimatesPageComponent } from "./estimates/pages/estimates-page.component";

type Tab = "customers" | "home" | "estimates";

@Component({
  imports: [
    NavigationRowComponent,
    Modal,
    Pressable,
    IconComponent,
    AgendaPageComponent,
    BackupPageComponent,
    BusinessPageComponent,
    PageLayoutComponent,
    SafeAreaProvider,
    SafeAreaView,
    Text,
    View,
    HomeComponent,
    ToastComponent,
    CustomersPageComponent,
    EstimatesPageComponent,
  ],
  selector: "app-root",
  template: `
    <safe-area-provider>
      <safe-area-view class="app-screen flex-1">
        <view class="flex-1">
          @if (shell.information() === "backup") {
            <nora-backup />
          } @else if (shell.information()) {
            <nora-page-layout
              [title]="
                shell.information() === 'help' ? 'Ayuda' : 'Acerca de Nora'
              "
              backLabel="Volver"
              (back)="shell.information.set(null)"
            >
              @if (shell.information() === "help") {
                <text class="body-text"
                  >Tus clientes y presupuestos se guardan en este teléfono. El
                  guardado local no es una copia de seguridad: guardá una desde
                  el menú, en Copia de seguridad.</text
                >
                <text class="body-text"
                  >Revisá el presupuesto antes de compartir el PDF. Compartir no
                  confirma entrega ni cambia su estado.</text
                >
              } @else {
                <text class="section-title">Nora · 1.0.0</text>
                <text class="body-text">Un poco de orden para tu trabajo.</text>
                <text class="muted"
                  >Una herramienta offline para clientes y presupuestos.</text
                >
              }
            </nora-page-layout>
          } @else if (business.visible()) {
            <nora-business />
          } @else if (agenda.visible()) {
            <nora-agenda />
          } @else {
            @switch (tab()) {
              @case ("home") {
                <nora-home
                  (listed)="showEstimates($event)"
                  (created)="newEstimate()"
                  (opened)="openEstimate($event)"
                />
              }
              @case ("customers") {
                <nora-customers />
              }
              @case ("estimates") {
                <nora-estimates />
              }
            }
          }
        </view>
        <nora-toast />
        @if (showTabs()) {
          <view class="tab-bar flex-row items-center px-3 py-2">
            @for (item of tabs; track item.id) {
              <pressable
                accessibilityRole="tab"
                [accessibilityLabel]="item.label"
                [accessibilityState]="{ selected: tab() === item.id }"
                (press)="tab.set(item.id)"
                class="tab-item flex-1 items-center justify-center gap-1"
                [class.tab-item-active]="tab() === item.id"
              >
                <nora-icon
                  [name]="item.icon"
                  [color]="tab() === item.id ? '#17645B' : '#526071'"
                />
                <text
                  class="tab-label"
                  [class.tab-text-active]="tab() === item.id"
                  >{{ item.label }}</text
                >
              </pressable>
            }
          </view>
        }
        <modal
          [visible]="shell.menuOpen()"
          [transparent]="true"
          animationType="none"
          (requestClose)="shell.menuOpen.set(false)"
        >
          @if (shell.menuOpen()) {
            <view class="drawer-scrim">
              <pressable
                class="flex-1"
                accessibilityRole="button"
                accessibilityLabel="Cerrar menú"
                (press)="shell.menuOpen.set(false)"
              />
              <safe-area-view
                class="drawer-panel"
                animate.enter="drawer-enter"
                [accessibilityViewIsModal]="true"
              >
                <view class="flex-row items-center justify-between gap-3">
                  <text class="heading flex-1">Menú</text>
                  <pressable
                    class="header-settings items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar menú"
                    (press)="shell.menuOpen.set(false)"
                    ><nora-icon name="bootstrapXLg"
                  /></pressable>
                </view>
                <text class="section-title">Nora</text
                ><text class="muted">Un poco de orden para tu trabajo.</text>
                <nora-navigation-row
                  text="Datos del negocio"
                  detail="Nombre, contacto y logo"
                  (pressed)="openBusiness()"
                />
                <nora-navigation-row
                  text="Agenda"
                  detail="Visitas y seguimientos con aviso"
                  (pressed)="openAgenda()"
                />
                <nora-navigation-row
                  text="Copia de seguridad"
                  detail="Guardar y restaurar tus datos"
                  (pressed)="openInformation('backup')"
                />
                <nora-navigation-row
                  text="Ayuda"
                  detail="Uso y guardado local"
                  (pressed)="openInformation('help')"
                />
                <nora-navigation-row
                  text="Acerca de Nora"
                  (pressed)="openInformation('about')"
                />
              </safe-area-view>
            </view>
          }
        </modal>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: ":host { flex: 1; }",
})
export class App {
  protected readonly shell = inject(ShellService);
  protected readonly customers = inject(CustomersPageService);
  protected readonly estimates = inject(EstimatesPageService);
  protected readonly showTabs = computed(
    () =>
      !this.business.visible() &&
      !this.agenda.visible() &&
      !this.shell.information() &&
      (this.tab() === "home" ||
        (this.tab() === "customers"
          ? this.customers.screen() === "list"
          : this.estimates.screen() === "list")),
  );
  protected openBusiness(): void {
    this.shell.menuOpen.set(false);
    void this.business.open();
  }
  /**
   * Muestra la visita de un aviso por encima de la pantalla actual. Mientras algo escribe o hay un
   * borrador sin confirmar, el aviso queda pendiente y se abre al terminar. Si el usuario decide seguir
   * editando Mi negocio o la agenda, esa decisión se respeta y la pantalla no cambia.
   */
  private async openReminder(id: string): Promise<void> {
    if (this.reminderBlocked()) {
      this.pendingVisit.set(id);
      return;
    }
    this.opening.set(true);
    try {
      this.shell.menuOpen.set(false);
      if (this.shell.information() === "backup") this.backupPage.close();
      else this.shell.information.set(null);
      if (this.business.visible()) {
        await this.business.close();
        if (this.business.visible()) {
          // Seguir editando se respeta y descarta el toque repetido del mismo aviso; si Mi negocio no
          // cerró porque empezó una operación, se reintenta.
          if (this.interrupting()) this.pendingVisit.set(id);
          else this.dropDuplicate(id);
          return;
        }
      }
      // Cerrar Mi negocio es asíncrono: otra operación pudo empezar mientras tanto.
      if (this.interrupting()) {
        this.pendingVisit.set(id);
        return;
      }
      if (!(await this.agenda.openVisit(id))) this.dropDuplicate(id);
    } finally {
      this.opening.set(false);
    }
  }
  /** Quien eligió seguir editando no vuelve a ver la misma confirmación por un toque repetido. */
  private dropDuplicate(id: string): void {
    if (this.pendingVisit() === id) this.pendingVisit.set(null);
  }
  protected openAgenda(): void {
    this.shell.menuOpen.set(false);
    this.shell.information.set(null);
    void this.agenda.open();
  }
  protected openInformation(value: "help" | "about" | "backup"): void {
    this.shell.menuOpen.set(false);
    this.shell.information.set(value);
  }
  protected async showEstimates(status: "draft" | "sent"): Promise<void> {
    this.tab.set("estimates");
    await this.estimates.enter();
    this.estimates.statusFilter.set(status);
  }
  protected async newEstimate(): Promise<void> {
    this.tab.set("estimates");
    await this.estimates.enter();
    this.estimates.create();
  }
  protected async openEstimate(value: Estimate): Promise<void> {
    this.tab.set("estimates");
    await this.estimates.enter();
    this.estimates.open(value);
  }
  protected readonly business = inject(BusinessPageService);
  protected readonly agenda = inject(AgendaPageService);
  private readonly backupPage = inject(BackupPageService);
  private readonly addressEditor = inject(AddressEditorService);
  /** Hay un guardado, una lectura o un borrador que un cambio de pantalla interrumpiría. */
  private readonly interrupting = computed(
    () =>
      this.backupPage.busy() ||
      this.business.busy() ||
      this.business.loading() ||
      this.agenda.busy() ||
      this.addressEditor.draft() !== null,
  );
  /** Un aviso se está abriendo (incluida la confirmación de descarte): otro toque espera a que termine. */
  private readonly opening = signal(false);
  private readonly reminderBlocked = computed(
    () => this.opening() || this.interrupting(),
  );
  /** Aviso tocado durante una operación en curso: se abre cuando termina. */
  private readonly pendingVisit = signal<string | null>(null);
  protected readonly tab = signal<Tab>("home");
  protected readonly tabs: readonly {
    id: Tab;
    label: string;
    icon: "bootstrapPeople" | "bootstrapHouseDoor" | "bootstrapFileEarmarkText";
  }[] = [
    { id: "customers", label: "Clientes", icon: "bootstrapPeople" },
    { id: "home", label: "Inicio", icon: "bootstrapHouseDoor" },
    {
      id: "estimates",
      label: "Presupuestos",
      icon: "bootstrapFileEarmarkText",
    },
  ];
  constructor() {
    inject(DestroyRef).onDestroy(
      inject(HardwareBack).handle(() => {
        if (this.shell.menuOpen()) {
          this.shell.menuOpen.set(false);
          return true;
        }
        if (this.shell.information() === "backup") {
          // Misma lógica que el botón Volver: no cierra mientras la copia trabaja, pero consume el gesto.
          this.backupPage.close();
          return true;
        }
        if (this.shell.information()) {
          this.shell.information.set(null);
          return true;
        }
        return false;
      }),
    );
    inject(StatusBar).set({ style: "dark" });
    void this.agenda.bindNotifications(
      inject(DestroyRef),
      (id) => void this.openReminder(id),
    );
    effect(() => {
      const id = this.pendingVisit();
      if (id && !this.reminderBlocked()) {
        this.pendingVisit.set(null);
        untracked(() => void this.openReminder(id));
      }
    });
  }
}

import { ShellService } from "./shared/services/shell.service";
import { NavigationRowComponent } from "./shared/components/navigation-row/navigation-row.component";
import { CustomersPageService } from "./customers/services/customers-page.service";
import { EstimatesPageService } from "./estimates/services/estimates-page.service";
import type { Estimate } from "./estimates/models/estimate.model";
import { PageLayoutComponent } from "./shared/components/page-layout/page-layout.component";
import { BusinessPageComponent } from "./business/pages/business-page.component";
import { BusinessPageService } from "./business/services/business-page.service";
import { IconComponent } from "./shared/components/icon/icon.component";
import { Component, inject, signal, computed, DestroyRef } from "@angular/core";
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
          @if (shell.information()) {
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
                  guardado local no es una copia de seguridad.</text
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
  protected openInformation(value: "help" | "about"): void {
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
        if (this.shell.information()) {
          this.shell.information.set(null);
          return true;
        }
        return false;
      }),
    );
    inject(StatusBar).set({ style: "dark" });
  }
}

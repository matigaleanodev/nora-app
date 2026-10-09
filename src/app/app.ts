import { Component, inject, signal } from "@angular/core";
import {
  Pressable,
  SafeAreaProvider,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "@ng-native/components";
import { StatusBar } from "@ng-native/device";
import { HomeComponent } from "./features/home/home.component";

import { ToastComponent } from "./shared/components/toast/toast.component";

import { CustomersPageComponent } from "./customers/pages/customers-page.component";
import { EstimatesPageComponent } from "./estimates/pages/estimates-page.component";

type Tab = "customers" | "home" | "estimates";

@Component({
  imports: [
    Pressable,
    SafeAreaProvider,
    SafeAreaView,
    ScrollView,
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
        <view
          class="app-header flex-row items-center justify-between px-6 py-4"
        >
          <view class="flex-row items-center gap-3">
            <view class="brand-mark items-center justify-center"
              ><text class="brand-initial">n</text></view
            >
            <text class="brand-name">nora</text>
          </view>
          <text class="local-badge">EN TU TELÉFONO</text>
        </view>
        <view class="flex-1">
          @switch (tab()) {
            @case ("home") {
              <scroll-view
                class="flex-1"
                [contentContainerStyle]="{
                  padding: 24,
                  paddingTop: 12,
                  paddingBottom: 28,
                }"
                ><nora-home
              /></scroll-view>
            }
            @case ("customers") {
              <nora-customers />
            }
            @case ("estimates") {
              <nora-estimates />
            }
          }
        </view>
        <nora-toast />
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
              <text
                class="tab-symbol"
                [class.tab-text-active]="tab() === item.id"
                >{{ item.symbol }}</text
              >
              <text
                class="tab-label"
                [class.tab-text-active]="tab() === item.id"
                >{{ item.label }}</text
              >
            </pressable>
          }
        </view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: ":host { flex: 1; }",
})
export class App {
  protected readonly tab = signal<Tab>("home");
  protected readonly tabs: readonly {
    id: Tab;
    label: string;
    symbol: string;
  }[] = [
    { id: "customers", label: "Clientes", symbol: "♙" },
    { id: "home", label: "Inicio", symbol: "⌂" },
    { id: "estimates", label: "Presupuestos", symbol: "▤" },
  ];
  constructor() {
    inject(StatusBar).set({ style: "dark" });
  }
}

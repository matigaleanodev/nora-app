import { HomePageService } from "./home-page.service";
import { MoneyPipe } from "../../shared/pipes/money.pipe";
import { NavigationRowComponent } from "../../shared/components/navigation-row/navigation-row.component";
import { Component, inject, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { type Estimate } from "../../estimates/models/estimate.model";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
@Component({
  selector: "nora-home",
  imports: [
    MoneyPipe,
    Pressable,
    Text,
    View,
    ActionButtonComponent,
    PageLayoutComponent,
    NavigationRowComponent,
  ],
  template: `<nora-page-layout title="Mi negocio" [error]="vm.error()">
    <text class="muted">Tu trabajo, a mano.</text>
    @if (vm.loading()) {
      <text class="muted">Cargando tu negocio…</text>
    } @else if (vm.error()) {
      <nora-button text="Reintentar" (pressed)="vm.load()" />
    } @else {
      <view class="task-card rounded-lg p-4 gap-2">
        <text class="section-title">{{
          vm.profile()?.displayName || "Mi negocio"
        }}</text>
        <text class="muted">Datos que aparecen en tus presupuestos</text>
      </view>
      @if (!vm.profile() && !vm.dismissed()) {
        <text class="body-text">Completá los datos de tu negocio</text>
        <nora-button text="Ahora no" (pressed)="vm.dismissed.set(true)" />
      }
      <nora-button
        text="Editar datos del negocio"
        (pressed)="vm.business.open()"
      />
      <text class="section-title">Tus presupuestos</text>
      <view>
        <nora-navigation-row
          [text]="
            vm.drafts() + (vm.drafts() === 1 ? ' borrador' : ' borradores')
          "
          detail="Continuá donde quedaste"
          (pressed)="listed.emit('draft')"
        />
        <nora-navigation-row
          [text]="vm.sent() + (vm.sent() === 1 ? ' enviado' : ' enviados')"
          detail="Pendientes de respuesta"
          (pressed)="listed.emit('sent')"
        />
      </view>
      <nora-button
        text="Nuevo presupuesto"
        variant="primary"
        (pressed)="created.emit()"
      />
      <text class="section-title">Actividad reciente</text>
      @for (estimate of vm.recent(); track estimate.id) {
        <pressable
          class="compact-row gap-2"
          accessibilityRole="button"
          [accessibilityLabel]="'Abrir presupuesto ' + estimate.number"
          (press)="opened.emit(estimate)"
        >
          <view class="flex-row items-start gap-3"
            ><text class="body-text flex-1"
              >{{ estimate.number }} ·
              {{ estimate.customerSnapshot.name }}</text
            >
            <text class="task-title">{{
              vm.estimateTotal(estimate) | money: estimate.currency
            }}</text></view
          >
          <text class="footnote"
            >{{ estimate.description }} · {{ vm.labels[estimate.status] }}</text
          >
        </pressable>
      } @empty {
        <text class="muted">Todavía no hay presupuestos.</text>
      }
    }
  </nora-page-layout>`,
  styles: ":host { flex: 1; }",
})
export class HomeComponent {
  protected readonly vm = inject(HomePageService);
  readonly listed = output<"draft" | "sent">();
  readonly opened = output<Estimate>();
  readonly created = output<void>();
  constructor() {
    void this.vm.load();
  }
}

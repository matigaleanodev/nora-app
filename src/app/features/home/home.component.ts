import { HomePageService } from "./home-page.service";
import { Component, inject, output } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { type Estimate } from "../../estimates/models/estimate.model";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
@Component({
  selector: "nora-home",
  imports: [Pressable, Text, View, ActionButtonComponent, PageLayoutComponent],
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
      <nora-button
        [text]="vm.drafts() + ' borradores'"
        (pressed)="listed.emit('draft')"
      />
      <nora-button
        [text]="vm.sent() + ' enviados pendientes de respuesta'"
        (pressed)="listed.emit('sent')"
      />
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
          <text class="body-text"
            >{{ estimate.number }} · {{ estimate.customerSnapshot.name }}</text
          >
          <text class="muted"
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

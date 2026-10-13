import { Component, DestroyRef, inject } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { BusinessFormComponent } from "../components/business-form.component";
import { BusinessPageService } from "../services/business-page.service";
@Component({
  selector: "nora-business",
  imports: [
    Text,
    View,
    PageLayoutComponent,
    ActionButtonComponent,
    BusinessFormComponent,
  ],
  template: `<nora-page-layout
    title="Mi negocio"
    eyebrow="TUS DATOS"
    backLabel="Volver desde Mi negocio"
    [busy]="vm.busy() || vm.loading()"
    [error]="vm.error()"
    (back)="vm.close()"
  >
    @if (vm.loading()) {
      <text class="muted">Cargando tus datos…</text>
    }
    <nora-business-form
      [form]="vm.form()"
      [disabled]="vm.blocked()"
      (changed)="vm.update($event)"
      (chooseLogo)="vm.pickLogo()"
    />
    @if (vm.blocked() && !vm.loading() && !vm.busy()) {
      <nora-button text="Reintentar carga" (pressed)="vm.load()" />
    }
    <view page-footer class="form-footer px-6 py-3">
      <nora-button
        variant="primary"
        [text]="vm.busy() ? 'Guardando…' : 'Guardar datos'"
        label="Guardar datos del negocio"
        [disabled]="vm.blocked()"
        (pressed)="vm.save()"
      />
    </view>
  </nora-page-layout>`,
  styles: ":host { flex: 1; }",
})
export class BusinessPageComponent {
  protected readonly vm = inject(BusinessPageService);
  constructor() {
    this.vm.bindBack(inject(DestroyRef));
  }
}

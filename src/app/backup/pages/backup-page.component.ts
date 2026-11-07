import { Component, inject } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { ActionButtonComponent } from "../../shared/components/action-button/action-button.component";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { BackupPageService } from "../services/backup-page.service";

@Component({
  selector: "nora-backup",
  imports: [ActionButtonComponent, PageLayoutComponent, Text, View],
  template: `<nora-page-layout
    title="Copia de seguridad"
    backLabel="Volver"
    [busy]="vm.busy()"
    [error]="vm.error()"
    (back)="vm.close()"
  >
    <text class="body-text"
      >Tus clientes, presupuestos y datos del negocio viven sólo en este
      teléfono. Guardá una copia en un lugar seguro por si lo perdés, lo cambiás
      o reinstalás Nora.</text
    >
    <view class="task-card rounded-lg p-4 gap-3">
      <text class="section-title">Guardar copia</text>
      <text class="muted"
        >Crea un archivo con todos tus datos y el logo. Después elegís dónde
        guardarlo o a quién enviarlo.</text
      >
      <nora-button
        variant="primary"
        text="Guardar copia"
        [disabled]="vm.busy()"
        (pressed)="vm.save()"
      />
      @if (vm.lastCopy()) {
        <text class="footnote">Última copia creada: {{ vm.lastCopy() }}</text>
      }
    </view>
    <view class="task-card rounded-lg p-4 gap-3">
      <text class="section-title">Restaurar copia</text>
      <text class="muted"
        >Elegí un archivo de copia de Nora. Reemplaza todo lo que hay ahora en
        este teléfono, así que te pedimos confirmación antes.</text
      >
      <nora-button
        variant="secondary"
        text="Elegir archivo"
        [disabled]="vm.busy()"
        (pressed)="vm.restore()"
      />
    </view>
  </nora-page-layout>`,
  styles: ":host { flex: 1; }",
})
export class BackupPageComponent {
  protected readonly vm = inject(BackupPageService);
}

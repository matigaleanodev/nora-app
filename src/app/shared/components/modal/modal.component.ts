import { Component, input, output } from "@angular/core";
import {
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
} from "@ng-native/components";
import { ActionButtonComponent } from "../action-button/action-button.component";

/** Contenedor nativo reutilizable con acciones accesibles y contenido desplazable. */
@Component({
  selector: "nora-modal",
  imports: [
    Modal,
    SafeAreaView,
    KeyboardAvoidingView,
    ScrollView,
    View,
    Text,
    ActionButtonComponent,
  ],
  template: ` <modal
    [visible]="visible()"
    animationType="slide"
    (requestClose)="cancel.emit()"
  >
    <safe-area-view class="app-screen flex-1">
      <keyboard-avoiding-view class="flex-1" behavior="height">
        <view class="flex-row items-center justify-between gap-3 px-6 py-3">
          <text class="section-title">{{ title() }}</text>
          <nora-button text="Cancelar" (pressed)="cancel.emit()" />
        </view>
        <scroll-view
          class="flex-1"
          keyboardShouldPersistTaps="always"
          [contentContainerStyle]="{ padding: 24 }"
        >
          <ng-content />
          @if (error()) {
            <text class="error-text">{{ error() }}</text>
          }
        </scroll-view>
        <view class="form-footer px-6 py-3">
          <nora-button
            variant="primary"
            [text]="confirmLabel()"
            (pressed)="confirm.emit()"
          />
        </view>
      </keyboard-avoiding-view>
    </safe-area-view>
  </modal>`,
})
export class ModalComponent {
  readonly visible = input(false);
  readonly title = input.required<string>();
  readonly error = input("");
  readonly confirmLabel = input("Guardar");
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}

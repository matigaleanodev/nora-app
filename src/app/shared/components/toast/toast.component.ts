import { Component, inject } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "nora-toast",
  imports: [Pressable, Text, View],
  template: `
    @if (notifications.toast(); as toast) {
      <view
        class="toast-card flex-row items-center gap-3 p-3 rounded-2xl"
        animate.enter="toast-enter"
        animate.leave="toast-leave"
        [class.toast-success]="toast.variant === 'success'"
        [class.toast-warning]="toast.variant === 'warning'"
        [class.toast-danger]="toast.variant === 'danger'"
      >
        <view
          class="flex-1 gap-1"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <text class="toast-message">{{ toast.message }}</text>
        </view>
        <pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar notificación"
          (press)="notifications.dismiss()"
          class="toast-dismiss items-center justify-center"
        >
          <text class="toast-close">×</text>
        </pressable>
      </view>
    }
  `,
  styles:
    ":host { position: absolute; bottom: 84px; left: 16px; right: 16px; z-index: 20; }",
})
export class ToastComponent {
  protected readonly notifications = inject(NotificationService);
}

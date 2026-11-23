import {
  afterRenderEffect,
  Component,
  input,
  output,
  viewChild,
  inject,
  untracked,
} from "@angular/core";
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  View,
} from "@ng-native/components";
import { ShellService } from "../../services/shell.service";
import { IconComponent } from "../icon/icon.component";
import { Pressable } from "@ng-native/components";
import { ActionButtonComponent } from "../action-button/action-button.component";
@Component({
  selector: "nora-page-layout",
  imports: [
    Pressable,
    IconComponent,
    KeyboardAvoidingView,
    ScrollView,
    Text,
    View,
    ActionButtonComponent,
  ],
  template: `
    <keyboard-avoiding-view class="flex-1" behavior="padding">
      <view class="page-heading flex-row items-center gap-2 px-4 py-2">
        @if (backLabel()) {
          <nora-button
            variant="back"
            text="‹"
            [label]="backLabel()"
            [disabled]="busy()"
            (pressed)="back.emit()"
          />
        }

        <view class="flex-1 gap-1">
          <text class="heading" accessibilityRole="header">{{ title() }}</text>
        </view>
        @if (!backLabel()) {
          <pressable
            class="header-settings items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            (press)="shell.menuOpen.set(true)"
            ><nora-icon name="bootstrapList"
          /></pressable>
        }
      </view>
      <view class="page-body flex-1">
        <scroll-view
          class="flex-1"
          keyboardShouldPersistTaps="handled"
          [contentContainerStyle]="{ padding: 16, paddingBottom: 24 }"
          (scroll)="rememberScroll($event)"
          [scrollEventThrottle]="32"
        >
          <view class="gap-4" animate.enter="content-enter">
            <ng-content />
          </view>
        </scroll-view>
        <ng-content select="[page-fab]" />
      </view>
      @if (error()) {
        <view class="px-4 py-2">
          <text class="error-text" accessibilityLiveRegion="polite">{{
            error()
          }}</text>
        </view>
      }
      <ng-content select="[page-footer]" />
    </keyboard-avoiding-view>
  `,
  styles: ":host { flex: 1; }",
})
export class PageLayoutComponent {
  protected readonly shell = inject(ShellService);
  readonly title = input.required<string>();
  readonly eyebrow = input("");
  readonly error = input("");
  readonly backLabel = input("");
  readonly busy = input(false);
  readonly resetKey = input("list");
  readonly back = output<void>();
  private readonly scroll = viewChild(ScrollView);
  private readonly positions = new Map<string, number>();
  scrollToStart(): void {
    this.positions.delete(this.resetKey());
    this.scroll()?.scrollTo({ y: 0, animated: false });
  }
  protected rememberScroll(event: {
    nativeEvent?: { contentOffset?: { y?: number } };
  }): void {
    const y = event.nativeEvent?.contentOffset?.y;
    if (typeof y === "number") this.positions.set(this.resetKey(), y);
  }
  constructor() {
    // Al cambiar de vista vuelve arriba; escribir en un campo no reinicia el desplazamiento.
    afterRenderEffect(() => {
      const key = this.resetKey();
      const scroll = this.scroll();
      untracked(() =>
        scroll?.scrollTo({ y: this.positions.get(key) ?? 0, animated: false }),
      );
    });
  }
}

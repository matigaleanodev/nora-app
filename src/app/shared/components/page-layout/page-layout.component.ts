import {
  afterRenderEffect,
  Component,
  input,
  output,
  viewChild,
} from "@angular/core";
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  View,
} from "@ng-native/components";
import { ActionButtonComponent } from "../action-button/action-button.component";
@Component({
  selector: "nora-page-layout",
  imports: [
    KeyboardAvoidingView,
    ScrollView,
    Text,
    View,
    ActionButtonComponent,
  ],
  template: `
    <keyboard-avoiding-view class="flex-1" behavior="height">
      <view class="page-heading flex-row items-center gap-3 px-6 py-3">
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
          <text class="eyebrow">{{ eyebrow() }}</text>
          <text class="heading">{{ title() }}</text>
        </view>
      </view>
      <view class="page-body flex-1">
        <scroll-view
          class="flex-1"
          keyboardShouldPersistTaps="always"
          [contentContainerStyle]="{ padding: 24, paddingBottom: 100 }"
        >
          <view class="gap-4" animate.enter="content-enter">
            @if (error()) {
              <text class="error-text">{{ error() }}</text>
            }
            <ng-content />
          </view>
        </scroll-view>
        <ng-content select="[page-fab]" />
      </view>
      <ng-content select="[page-footer]" />
    </keyboard-avoiding-view>
  `,
  styles: ":host { flex: 1; }",
})
export class PageLayoutComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input("");
  readonly error = input("");
  readonly backLabel = input("");
  readonly busy = input(false);
  readonly resetKey = input("list");
  readonly back = output<void>();
  private readonly scroll = viewChild(ScrollView);
  constructor() {
    // Al cambiar de vista vuelve arriba; escribir en un campo no reinicia el desplazamiento.
    afterRenderEffect(() => {
      this.resetKey();
      this.scroll()?.scrollTo({ y: 0, animated: false });
    });
  }
}

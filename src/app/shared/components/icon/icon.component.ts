import { Component, input } from "@angular/core";
import { View } from "@ng-native/components";
import { NgIcon } from "@ng-native/icons";
import { provideIcons } from "@ng-icons/core";
import {
  bootstrapWhatsapp,
  bootstrapCheckLg,
  bootstrapPlusLg,
  bootstrapTrash3,
} from "@ng-icons/bootstrap-icons";

/** Los íconos son decorativos: el control padre recibe los toques y define su etiqueta accesible. */
@Component({
  selector: "nora-icon",
  imports: [View, NgIcon],
  providers: [
    provideIcons({
      bootstrapWhatsapp,
      bootstrapCheckLg,
      bootstrapPlusLg,
      bootstrapTrash3,
    }),
  ],
  template: `<view pointerEvents="none" [accessible]="false"
    ><ng-icon [name]="name()" [size]="size()" [color]="color()"
  /></view>`,
})
export class IconComponent {
  readonly name = input.required<
    | "bootstrapWhatsapp"
    | "bootstrapCheckLg"
    | "bootstrapPlusLg"
    | "bootstrapTrash3"
  >();
  readonly size = input(24);
  readonly color = input("#64685c");
}

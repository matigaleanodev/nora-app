import { inject, Injectable, signal } from "@angular/core";
import { Dialogs } from "@ng-native/device";
import type { CustomerInput } from "../models/customer.model";
type Address = CustomerInput["addresses"][number];
export interface AddressDraft {
  readonly index: number | null;
  readonly address: Address;
}

/**
 * Aísla los cambios del modal hasta que el usuario confirma la dirección. Es un servicio de la app para
 * que el shell sepa si hay un borrador abierto y no desmonte Clientes antes de confirmarlo o cancelarlo.
 */
@Injectable({ providedIn: "root" })
export class AddressEditorService {
  private readonly dialogs = inject(Dialogs);
  private readonly state = signal<AddressDraft | null>(null);
  private readonly errorState = signal("");
  readonly draft = this.state.asReadonly();
  readonly error = this.errorState.asReadonly();
  open(address?: Address, index: number | null = null): void {
    this.errorState.set("");
    this.state.set({
      index,
      address: address
        ? { ...address }
        : {
            name: "",
            street: "",
            streetNumber: "",
            city: "",
            province: "",
            floor: "",
            apartment: "",
          },
    });
  }
  update(changes: Partial<Omit<Address, "id">>): void {
    this.state.update((draft) =>
      draft ? { ...draft, address: { ...draft.address, ...changes } } : null,
    );
    this.errorState.set("");
  }
  cancel(): void {
    this.state.set(null);
    this.errorState.set("");
  }
  async remove(): Promise<number | null> {
    const draft = this.draft();
    if (!draft || draft.index === null) return null;
    const confirmed = await this.dialogs.confirm("¿Quitar dirección?", {
      message: "Se quitará de este cliente al guardar los cambios.",
      confirm: "Quitar",
      cancel: "Conservar",
      destructive: true,
    });
    if (!confirmed || this.draft()?.index !== draft.index) return null;
    this.cancel();
    return draft.index;
  }
  confirm(): AddressDraft | null {
    const draft = this.draft();
    if (!draft) return null;
    if (!draft.address.name.trim()) {
      this.errorState.set("Ingresá un nombre para la dirección.");
      return null;
    }
    this.cancel();
    return {
      ...draft,
      address: { ...draft.address, name: draft.address.name.trim() },
    };
  }
}

import { Component, signal } from "@angular/core";
import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { FormFieldComponent } from "./form-field.component";

const typed = vi.fn();

/** Campo controlado como en la app: el padre devuelve el valor emitido. */
@Component({
  imports: [FormFieldComponent],
  template: `<nora-field
    label="Precio"
    keyboard="decimal-pad"
    [value]="value()"
    (valueChange)="update($event)"
  />`,
})
class ControlledFieldHost {
  protected readonly value = signal("");
  protected update(next: string): void {
    this.value.set(next);
    typed(next);
  }
}

test("muestra el valor y emite cambios sin modificar ni convertir la entrada", async () => {
  await render(ControlledFieldHost);
  await userEvent.type(screen.getByLabelText("Precio"), "10,25");
  expect(typed).toHaveBeenLastCalledWith("10,25");
});

test("captura el email autocompletado al terminar de editar sin depender del tipeo", async () => {
  const valueChange = vi.fn();
  await render(FormFieldComponent, {
    inputs: {
      label: "Email",
      value: "",
      keyboard: "email-address",
      autoComplete: "email",
    },
    on: { valueChange },
  });
  await fireEvent(screen.getByLabelText("Email"), "endEditing", {
    text: "ana@gmail.com",
  });
  expect(valueChange).toHaveBeenCalledWith("ana@gmail.com");
});
test("un evento de fin de edición sin texto no borra un valor existente", async () => {
  const valueChange = vi.fn();
  await render(FormFieldComponent, {
    inputs: { label: "Email", value: "ana@gmail.com" },
    on: { valueChange },
  });
  await fireEvent(screen.getByLabelText("Email"), "endEditing", {});
  expect(valueChange).not.toHaveBeenCalled();
});

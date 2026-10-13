import { render, screen, fireEvent, userEvent } from "@ng-native/testing";
import { Dialogs, HardwareBack } from "@ng-native/device";
import { expect, test, vi } from "vitest";
import { BusinessPageComponent } from "./business-page.component";
import { BusinessPageService } from "../services/business-page.service";
import { BusinessProfileService } from "../services/business-profile.service";
import { BusinessLogoService } from "../services/business-logo.service";
import { NotificationService } from "../../shared/services/notification.service";
import type { BusinessForm } from "../models/business-profile.model";
async function setup(failLoad = false) {
  const profiles = {
    get: failLoad
      ? vi.fn().mockRejectedValue(new Error("disco"))
      : vi.fn().mockResolvedValue(null),
    save: vi.fn(async (form: BusinessForm) => ({
      displayName: form.displayName,
      email: form.email,
      logo: form.logo,
      updatedAt: "2026-10-09T00:00:00Z",
    })),
  };
  const logos = { pick: vi.fn().mockResolvedValue(null) };
  const notifications = { success: vi.fn(), danger: vi.fn() };
  const confirm = vi.fn().mockResolvedValue(true);
  let handler: (() => boolean) | undefined;
  const unsubscribe = vi.fn();
  const result = await render(BusinessPageComponent, {
    providers: [
      { provide: BusinessProfileService, useValue: profiles },
      { provide: BusinessLogoService, useValue: logos },
      { provide: NotificationService, useValue: notifications },
      { provide: Dialogs, useValue: { confirm } },
      {
        provide: HardwareBack,
        useValue: {
          handle: (callback: () => boolean) => {
            handler = callback;
            return unsubscribe;
          },
        },
      },
    ],
  });
  const page = result.componentRef.injector.get(BusinessPageService);
  await page.open();
  return {
    page,
    profiles,
    logos,
    notifications,
    confirm,
    result,
    back: () => handler?.(),
    unsubscribe,
  };
}
test("el formulario guarda nombre y email autocompletado y avisa el resultado", async () => {
  const { profiles, notifications, page } = await setup();
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Juan Pérez",
  );
  await fireEvent(screen.getByLabelText("Email"), "endEditing", {
    text: "juan@example.com",
  });
  await userEvent.press(
    screen.getByRole("button", { name: "Guardar datos del negocio" }),
  );
  expect(profiles.save).toHaveBeenCalledWith(
    expect.objectContaining({
      displayName: "Juan Pérez",
      email: "juan@example.com",
    }),
  );
  expect(notifications.success).toHaveBeenCalledWith(
    "Datos de tu negocio guardados.",
  );
  expect(page.dirty()).toBe(false);
});
test("un fallo de guardado conserva el formulario y permite reintentar", async () => {
  const { profiles, notifications, page } = await setup();
  profiles.save.mockRejectedValueOnce(new Error("Guardado fallido"));
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Juan Pérez",
  );
  await userEvent.press(
    screen.getByRole("button", { name: "Guardar datos del negocio" }),
  );
  expect(page.form().displayName).toBe("Juan Pérez");
  expect(page.busy()).toBe(false);
  expect(notifications.danger).toHaveBeenCalledWith("Guardado fallido");
});
test("cancelar la galería conserva el logo y elegir uno no lo persiste antes de guardar", async () => {
  const { logos, profiles, page } = await setup();
  await userEvent.press(screen.getByRole("button", { name: "Elegir logo" }));
  expect(page.form().logo).toBeUndefined();
  logos.pick.mockResolvedValueOnce({
    uri: "file:///cache/logo.png",
    mimeType: "image/png",
  });
  await userEvent.press(screen.getByRole("button", { name: "Elegir logo" }));
  expect(page.form().logo?.uri).toBe("file:///cache/logo.png");
  expect(profiles.save).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole("button", { name: "Quitar logo" }));
  expect(page.form().logo).toBeUndefined();
});
test("volver por Android respeta la confirmación y libera el listener al destruir", async () => {
  const { page, confirm, back, result, unsubscribe } = await setup();
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Sin guardar",
  );
  confirm.mockResolvedValueOnce(false);
  expect(back()).toBe(true);
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  expect(page.visible()).toBe(true);
  await page.close();
  expect(page.visible()).toBe(false);
  result.unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});
test("un fallo de lectura bloquea el guardado para evitar sobrescribir datos", async () => {
  const { page, profiles } = await setup(true);
  expect(page.blocked()).toBe(true);
  await userEvent.press(
    screen.getByRole("button", { name: "Guardar datos del negocio" }),
  );
  expect(profiles.save).not.toHaveBeenCalled();
  profiles.get.mockResolvedValueOnce(null);
  await userEvent.press(
    screen.getByRole("button", { name: "Reintentar carga" }),
  );
  expect(page.blocked()).toBe(false);
});

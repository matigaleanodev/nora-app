import { injectService } from "@ng-native/testing";
import { beforeEach, expect, test, vi } from "vitest";
import { ContactActionsService } from "./contact-actions.service";

const linking = vi.hoisted(() => ({ openURL: vi.fn() }));
vi.mock("react-native", () => ({ Linking: linking }));

beforeEach(() => vi.clearAllMocks());

test("abre el enlace sin consultar canOpenURL", async () => {
  linking.openURL.mockResolvedValue(undefined);
  await injectService(ContactActionsService).open("tel:+5493764123456", "x");
  expect(linking.openURL).toHaveBeenCalledWith("tel:+5493764123456");
});
test("traduce el rechazo del sistema a un mensaje para el usuario", async () => {
  linking.openURL.mockRejectedValue(new Error("Unable to open URL"));
  await expect(
    injectService(ContactActionsService).open("mailto:a@b.c", "No hay correo."),
  ).rejects.toThrow("No hay correo.");
});

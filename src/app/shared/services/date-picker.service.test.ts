import { injectService } from "@ng-native/testing";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { beforeEach, expect, test, vi } from "vitest";
import { DatePickerService } from "./date-picker.service";
import { NotificationService } from "./notification.service";

const open = vi.mocked(DateTimePickerAndroid.open);
const danger = vi.fn();
const setup = () =>
  injectService(DatePickerService, {
    providers: [{ provide: NotificationService, useValue: { danger } }],
  });
beforeEach(() => vi.resetAllMocks());

test("abre en la misma llamada y descarta pulsaciones simultáneas sin encolarlas", async () => {
  const picker = setup();
  const first = picker.pick("2026-10-17");
  expect(open).toHaveBeenCalledOnce();
  expect(open.mock.calls[0][0].value).toEqual(new Date(2026, 9, 17, 12));
  await expect(picker.pick("2026-12-31")).resolves.toBeNull();
  expect(open).toHaveBeenCalledOnce();
  open.mock.calls[0][0].onValueChange?.(
    { nativeEvent: { timestamp: 0, utcOffset: 0 } },
    new Date(2026, 9, 20),
  );
  await expect(first).resolves.toBe("2026-10-20");
  expect(open).toHaveBeenCalledOnce();
  const next = picker.pick("2026-10-20");
  expect(open).toHaveBeenCalledTimes(2);
  open.mock.calls[1][0].onDismiss?.();
  await expect(next).resolves.toBeNull();
});

test("un error nativo libera el bloqueo y permite reintentar", async () => {
  const picker = setup();
  const first = picker.pick("");
  open.mock.calls[0][0].onError?.(new Error("Error nativo"));
  await expect(first).resolves.toBeNull();
  expect(danger).toHaveBeenCalledOnce();
  const next = picker.pick("");
  open.mock.calls[1][0].onDismiss?.();
  await expect(next).resolves.toBeNull();
});

test("una excepción al abrir no deja bloqueado el calendario", async () => {
  open.mockImplementationOnce(() => {
    throw new Error("Sin calendario");
  });
  const picker = setup();
  await expect(picker.pick("")).resolves.toBeNull();
  const next = picker.pick("");
  open.mock.calls[1][0].onDismiss?.();
  await expect(next).resolves.toBeNull();
  expect(open).toHaveBeenCalledTimes(2);
});

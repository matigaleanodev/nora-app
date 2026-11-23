import { fireEvent, render, screen, userEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { CustomersService } from "../../customers/services/customers.service";
import { customerFixture } from "../../shared/testing/domain-fixtures";
import { calendarDateFromLocal } from "../../shared/utils/calendar-date";
import { VisitKind, VisitStatus, type Visit } from "../models/visit.model";
import { AgendaPageService } from "../services/agenda-page.service";
import { VisitRemindersService } from "../services/visit-reminders.service";
import { VisitsService } from "../services/visits.service";
import { AgendaPageComponent } from "./agenda-page.component";

async function setup() {
  const visits = { getAll: vi.fn().mockResolvedValue([]) };
  const customers = { getAll: vi.fn().mockResolvedValue([customerFixture]) };
  const result = await render(AgendaPageComponent, {
    providers: [
      { provide: VisitsService, useValue: visits },
      { provide: CustomersService, useValue: customers },
      {
        provide: VisitRemindersService,
        useValue: { reconcile: vi.fn().mockResolvedValue(undefined) },
      },
    ],
  });
  const page = result.componentRef.injector.get(AgendaPageService);
  return { visits, customers, page, result, user: userEvent.setup() };
}

test("una falla de lectura de agenda se puede reintentar desde la lista", async () => {
  const { visits, page, result, user } = await setup();
  visits.getAll.mockRejectedValueOnce(new Error("SQLite ocupado"));
  await page.open();
  await result.detectChanges();
  expect(screen.queryByText("Sin visitas pendientes")).toBeNull();
  expect(screen.getByText(/No pudimos cargar tu agenda/)).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Reintentar carga" }));
  await vi.waitFor(() =>
    expect(screen.getByText("Sin visitas pendientes")).toBeTruthy(),
  );
});

test("una recarga no permite abrir una visita que pertenece al estado anterior", async () => {
  const { visits, page, result } = await setup();
  const previous: Visit = {
    id: "5cb1263b-c9fd-40cc-8a8c-2aa820ce3f24",
    title: "Antes de restaurar",
    kind: VisitKind.Visit,
    status: VisitStatus.Pending,
    date: calendarDateFromLocal(new Date()),
    createdAt: "2026-11-22T00:00:00.000Z",
    updatedAt: "2026-11-22T00:00:00.000Z",
  };
  visits.getAll.mockResolvedValueOnce([previous]);
  await page.open();
  await result.detectChanges();
  expect(screen.getByText(previous.title)).toBeTruthy();

  const restored = Promise.withResolvers<Visit[]>();
  visits.getAll.mockReturnValueOnce(restored.promise);
  const loading = page.load();
  await result.detectChanges();
  expect(screen.getByText("Cargando agenda…")).toBeTruthy();
  expect(screen.queryByText(previous.title)).toBeNull();

  restored.resolve([{ ...previous, title: "Visita restaurada" }]);
  await loading;
  await result.detectChanges();
  expect(screen.getByText("Visita restaurada")).toBeTruthy();
});

test("una falla del selector de clientes permite reintentar y conserva la visita", async () => {
  const { customers, page, result, user } = await setup();
  customers.getAll.mockRejectedValueOnce(new Error("SQLite ocupado"));
  await page.open();
  await result.detectChanges();
  await user.press(screen.getByRole("button", { name: "Agregar visita" }));
  await fireEvent.changeText(
    screen.getByLabelText("Título"),
    "Revisar tablero",
  );
  await user.press(screen.getByRole("button", { name: "Elegir cliente" }));
  expect(screen.queryByText("No hay clientes activos.")).toBeNull();
  await user.press(
    await screen.findByRole("button", { name: "Reintentar carga" }),
  );
  await user.press(
    await screen.findByRole("button", { name: "Elegir Ana García" }),
  );
  expect(screen.getByDisplayValue("Revisar tablero")).toBeTruthy();
  expect(page.form().customerId).toBe(customerFixture.id);
});

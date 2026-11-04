import { inject, Injectable } from "@angular/core";
import { calendarDateToLocal } from "../../shared/utils/calendar-date";
import {
  VISIT_KIND_LABELS,
  VisitStatus,
  type Visit,
} from "../models/visit.model";
import { VisitsService } from "./visits.service";

const CHANNEL = "agenda";
/** Sin hora, el aviso llega a primera hora; con hora, media hora antes para llegar a tiempo. */
const MORNING_HOUR = 8;
const LEAD_MINUTES = 30;
/** Un aviso a menos de este margen ya no se programa: el sistema lo mostraría de inmediato. */
const MIN_AHEAD_MS = 10_000;

/** Instante local del aviso de una visita. */
export function reminderTime(visit: Pick<Visit, "date" | "time">): Date {
  const day = calendarDateToLocal(visit.date);
  const [hours, minutes] = visit.time
    ? visit.time.split(":").map(Number)
    : [MORNING_HOUR, 0];
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    visit.time ? minutes! - LEAD_MINUTES : 0,
  );
}
/** Pendiente y con aviso en el futuro: sólo esas visitas tienen un aviso programado. */
function isWanted(visit: Visit): boolean {
  return (
    visit.status === VisitStatus.Pending &&
    reminderTime(visit).getTime() >= Date.now() + MIN_AHEAD_MS
  );
}
export interface ScheduledReminder {
  /** Identificador del aviso; ausente si no hace falta o no se pudo programar. */
  readonly id?: string;
  /** El usuario no concedió el permiso de notificaciones. */
  readonly denied?: boolean;
}

type Notifications = typeof import("expo-notifications");

/**
 * Avisos locales de la agenda con expo-notifications; no usa servidores ni push.
 *
 * El identificador nativo de cada aviso es el UUID de su visita: programar de nuevo reemplaza el aviso
 * anterior y nunca puede haber dos para la misma visita. Además, todas las operaciones sobre avisos se
 * ejecutan una por una, para que arranque, apertura de Agenda, edición y restauración no se pisen.
 */
@Injectable({ providedIn: "root" })
export class VisitRemindersService {
  private readonly visits = inject(VisitsService);
  private opened = false;
  private tail: Promise<unknown> = Promise.resolve();

  /**
   * Deja el aviso de la visita como corresponde a su estado: lo programa (reemplazando el anterior) si
   * está pendiente y es futura, y lo quita si no. Pide el permiso sólo si ask es true.
   */
  schedule(visit: Visit, ask = true): Promise<ScheduledReminder> {
    return this.enqueue(async () => {
      const notifications = await import("expo-notifications");
      if (!isWanted(visit)) {
        await this.drop(notifications, visit.id);
        return {};
      }
      if (!(await this.permitted(notifications, ask))) {
        // Sin permiso no hay aviso nuevo, y uno anterior con otra hora ya no es válido.
        await this.drop(notifications, visit.id);
        return { denied: true };
      }
      await this.replace(notifications, visit);
      return { id: visit.id };
    });
  }

  /** Quita el aviso de una visita eliminada. */
  cancel(visitId: string | undefined): Promise<void> {
    if (!visitId) return Promise.resolve();
    return this.enqueue(async () => {
      try {
        await this.drop(await import("expo-notifications"), visitId);
      } catch {
        /* Sin módulo nativo no hay avisos que quitar. */
      }
    });
  }

  /** Quita todos los avisos de Nora (la app sólo programa avisos de agenda), por ejemplo antes de restaurar una copia. */
  cancelAll(): Promise<void> {
    return this.enqueue(async () => {
      try {
        const notifications = await import("expo-notifications");
        await notifications.cancelAllScheduledNotificationsAsync();
      } catch {
        /* Sin avisos que quitar o sin módulo nativo. */
      }
    });
  }

  /**
   * Corrige los avisos tras reinstalar, restaurar una copia o reiniciar. Lee las visitas dentro de la
   * cola, así nunca actúa con una lista vieja: reprograma las pendientes sin aviso, quita los de visitas
   * hechas, vencidas o inexistentes y guarda la marca `reminderId`. Nunca pide permisos.
   */
  reconcile(): Promise<void> {
    return this.enqueue(async () => {
      try {
        const notifications = await import("expo-notifications");
        if (!(await this.permitted(notifications, false))) return;
        const visits = await this.visits.getAll();
        const active = new Map(
          (await notifications.getAllScheduledNotificationsAsync()).map(
            (request) => [request.identifier, request] as const,
          ),
        );
        const wanted = new Set<string>();
        const changes: Record<string, string | null> = {};
        for (const visit of visits) {
          if (!isWanted(visit)) {
            if (visit.reminderId) changes[visit.id] = null;
            continue;
          }
          wanted.add(visit.id);
          const current = active.get(visit.id);
          try {
            // Un aviso con el mismo UUID pero otra hora o texto (por ejemplo, tras un reemplazo
            // rechazado) no sirve: se vuelve a programar con lo que dice la visita hoy.
            if (!current || !this.matches(current, visit))
              await this.replace(notifications, visit);
            if (visit.reminderId !== visit.id) changes[visit.id] = visit.id;
          } catch {
            // replace() ya quitó el aviso viejo; la próxima reconciliación vuelve a intentarlo.
            if (visit.reminderId) changes[visit.id] = null;
          }
        }
        for (const id of active.keys())
          if (!wanted.has(id)) await this.drop(notifications, id);
        if (Object.keys(changes).length > 0)
          await this.visits.setReminders(changes);
      } catch {
        /* Los avisos son complementarios: la agenda sigue funcionando sin ellos. */
      }
    });
  }

  /** Abre la visita cuando se toca un aviso, también si el toque inició la app. */
  async onOpen(handler: (visitId: string) => void): Promise<() => void> {
    const notifications = await import("expo-notifications");
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    const open = (response: {
      notification: { request: { content: { data?: unknown } } };
    }): void => {
      const data = response.notification.request.content.data as Record<
        string,
        unknown
      > | null;
      const id = data?.["visitId"];
      if (typeof id === "string") handler(id);
    };
    if (!this.opened) {
      this.opened = true;
      const launch = await notifications.getLastNotificationResponseAsync();
      if (launch) open(launch);
    }
    const subscription =
      notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.catch(() => undefined);
    return run;
  }

  /**
   * Programa reemplazando el aviso de la visita. Si Expo rechaza el reemplazo, el aviso anterior seguiría
   * activo con la hora vieja: se quita antes de propagar el error.
   */
  private async replace(
    notifications: Notifications,
    visit: Visit,
  ): Promise<void> {
    try {
      await this.place(notifications, visit);
    } catch (error) {
      await this.drop(notifications, visit.id);
      throw error;
    }
  }

  /** El aviso activo coincide con lo que debería decir hoy la visita: instante, título, texto y vínculo. */
  private matches(
    request: import("expo-notifications").NotificationRequest,
    visit: Visit,
  ): boolean {
    const trigger = (request.trigger ?? {}) as {
      type?: string;
      value?: unknown;
    };
    const data = request.content.data as Record<string, unknown> | undefined;
    return (
      trigger.type === "date" &&
      trigger.value === reminderTime(visit).getTime() &&
      request.content.title === visit.title &&
      request.content.body === this.body(visit) &&
      data?.["visitId"] === visit.id
    );
  }

  private async place(
    notifications: Notifications,
    visit: Visit,
  ): Promise<void> {
    await this.ensureChannel(notifications);
    await notifications.scheduleNotificationAsync({
      identifier: visit.id,
      content: {
        title: visit.title,
        body: this.body(visit),
        data: { visitId: visit.id },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime(visit),
        channelId: CHANNEL,
      },
    });
  }

  private async drop(notifications: Notifications, id: string): Promise<void> {
    try {
      await notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* Un aviso ya entregado o inexistente no invalida el cambio de la visita. */
    }
  }

  private body(visit: Visit): string {
    const moment = visit.time ? `a las ${visit.time}` : "hoy";
    return [`${VISIT_KIND_LABELS[visit.kind]} ${moment}`, visit.customerName]
      .filter(Boolean)
      .join(" · ");
  }

  private async permitted(
    notifications: Notifications,
    ask: boolean,
  ): Promise<boolean> {
    let status = await notifications.getPermissionsAsync();
    if (!status.granted && ask && status.canAskAgain)
      status = await notifications.requestPermissionsAsync();
    return status.granted;
  }

  private async ensureChannel(notifications: Notifications): Promise<void> {
    try {
      await notifications.setNotificationChannelAsync(CHANNEL, {
        name: "Agenda",
        importance: notifications.AndroidImportance.DEFAULT,
      });
    } catch {
      /* iOS no usa canales; en Android un fallo deja el canal predeterminado. */
    }
  }
}

import { logger } from "../config/logger.js";
import type { INotificationPreferencesRepository } from "../email/notification-repository-types.js";
import type { NotificationService } from "../email/notification-service.js";
import type { BotFleetEvent, FleetEventEmitter } from "./fleet-event-emitter.js";

export interface FleetNotificationListenerDeps {
  eventEmitter: FleetEventEmitter;
  notificationService: NotificationService;
  preferences: INotificationPreferencesRepository;
  /** Resolve tenant ID to owner email. Return null if no email found. */
  resolveEmail: (tenantId: string) => Promise<string | null>;
}

export function initFleetNotificationListener(deps: FleetNotificationListenerDeps): () => void {
  const { eventEmitter, notificationService, preferences, resolveEmail } = deps;

  const unsubscribe = eventEmitter.subscribe((event) => {
    // Only handle bot events with tenantId
    if (!("tenantId" in event)) return;
    const botEvent = event as BotFleetEvent;

    if (botEvent.type !== "bot.updated" && botEvent.type !== "bot.update_failed") return;

    // Fire-and-forget async work; errors are caught inside.
    void (async () => {
      try {
        // Check preference
        const prefs = await preferences.get(botEvent.tenantId);
        if (!prefs.fleet_updates) return;

        // Resolve email
        const email = await resolveEmail(botEvent.tenantId);
        if (!email) {
          logger.warn("Fleet notification skipped: no email for tenant", {
            tenantId: botEvent.tenantId,
          });
          return;
        }

        if (botEvent.type === "bot.updated") {
          notificationService.notifyFleetUpdateComplete(botEvent.tenantId, email, "latest", 1, 0);
        } else {
          notificationService.notifyFleetUpdateComplete(botEvent.tenantId, email, "latest", 0, 1);
        }
      } catch (err) {
        logger.error("Fleet notification listener error", {
          err,
          event: botEvent.type,
          tenantId: botEvent.tenantId,
        });
      }
    })();
  });

  return unsubscribe;
}

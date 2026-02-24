import type { NotificationPreferences } from "./api";
import { trpcVanilla } from "./trpc";

// ---- Typed settings/capabilities client stubs ----
// AppRouter is a placeholder until @wopr-network/sdk publishes the full types.
// We define the shape we need here to avoid raw fetch boilerplate while keeping
// the call sites type-checked against our own interface declarations.

interface SettingsProcedures {
  notificationPreferences: {
    query(input?: Record<never, never>): Promise<NotificationPreferences>;
  };
  updateNotificationPreferences: {
    mutate(input: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  };
}

interface CapabilitiesProcedures {
  storeKey: {
    mutate(input: {
      provider: string;
      apiKey: string;
      label?: string;
    }): Promise<{ ok: true; id: string; provider: string }>;
  };
  testKey: {
    mutate(input: { provider: string; key: string }): Promise<{ valid: boolean; error?: string }>;
  };
}

// NOTE(WOP-812): Cast via unknown to avoid @typescript/no-explicit-any while bridging the
// placeholder AppRouter gap. Remove once @wopr-network/sdk ships real types.
const settingsClient = (trpcVanilla as unknown as { settings: SettingsProcedures }).settings; // NOTE(WOP-812): remove cast once sdk ships
const capabilitiesClient = (trpcVanilla as unknown as { capabilities: CapabilitiesProcedures }) // NOTE(WOP-812): remove cast once sdk ships
  .capabilities;

// ---- Settings API calls ----

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return settingsClient.notificationPreferences.query();
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return settingsClient.updateNotificationPreferences.mutate(prefs);
}

// ---- Capabilities API calls ----

export async function saveProviderKey(
  provider: string,
  key: string,
): Promise<{ ok: true; id: string; provider: string }> {
  return capabilitiesClient.storeKey.mutate({ provider, apiKey: key });
}

export async function testProviderKey(
  provider: string,
  key: string,
): Promise<{ valid: boolean; error?: string }> {
  return capabilitiesClient.testKey.mutate({ provider, key });
}

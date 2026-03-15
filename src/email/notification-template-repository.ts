/**
 * INotificationTemplateRepository — interface for DB-driven email templates.
 *
 * Follows the IFooRepo pattern: interface here, Drizzle impl in a sibling file.
 */

/** Row shape returned by the template repository. */
export interface NotificationTemplateRow {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Repository contract for notification templates. */
export interface INotificationTemplateRepository {
  getByName(name: string): Promise<NotificationTemplateRow | null>;
  list(): Promise<NotificationTemplateRow[]>;
  upsert(
    name: string,
    template: Omit<NotificationTemplateRow, "id" | "name" | "createdAt" | "updatedAt">,
  ): Promise<void>;
  /**
   * Seed default templates — INSERT OR IGNORE so admin edits are not overwritten.
   * @returns number of templates inserted (not already present).
   */
  seed(
    templates: Array<{
      name: string;
      description: string;
      subject: string;
      htmlBody: string;
      textBody: string;
    }>,
  ): Promise<number>;
}

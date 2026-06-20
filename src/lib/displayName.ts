import type { TFunction } from 'i18next';

/**
 * Default items (is_default) store their name as an i18n key and must be
 * translated; user-created items store a literal name shown as-is.
 */
export function displayName(item: { name: string; is_default: boolean }, t: TFunction): string {
  return item.is_default ? t(item.name) : item.name;
}

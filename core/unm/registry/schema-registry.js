/**
 * UNM Schema Registry — MASTER_FILE_STRUCTURE: "نگه‌داری نسخه‌های Schema و قوانین
 * Migration بین نسخه‌ها" (schema VERSIONS and migration rules — NOT runtime node
 * storage, which is core/store/'s job).
 *
 * Phase 1 seeds only the current version. Migration logic arrives when the
 * schema first changes (which itself requires a new ADR — UNM is a Freeze zone).
 */

/** Current UNM schema version. Mirrors 05-UNIVERSAL_NODE_MODEL Document Control (v1.4). */
export const UNM_SCHEMA_VERSION = "1.4";

/**
 * Registered schema versions, newest last. Each future entry will carry a
 * `migrate(prevNode)` function once a breaking change is approved.
 * @type {ReadonlyArray<{ version: string }>}
 */
export const SCHEMA_VERSIONS = Object.freeze([
  { version: "1.4" },
]);

/**
 * UNM Schema Registry — MASTER_FILE_STRUCTURE: "نگه‌داری نسخه‌های Schema و قوانین
 * Migration بین نسخه‌ها" (schema VERSIONS and migration rules — NOT runtime node
 * storage, which is core/store/'s job).
 *
 * Phase 1 seeds only the current version. Migration logic arrives when the
 * schema first changes (which itself requires a new ADR — UNM is a Freeze zone).
 */

/**
 * Current UNM schema version — independent of the 05-UNIVERSAL_NODE_MODEL
 * blueprint document's own revision number. The document version tracks edits
 * to the spec text; this constant tracks actual `UNMNode` shape changes at
 * runtime and only increments when those change. "1.0" is the first real
 * runtime implementation of the schema (Phase 1).
 */
export const UNM_SCHEMA_VERSION = "1.0";

/**
 * Registered schema versions, newest last. Each future entry will carry a
 * `migrate(prevNode)` function once a breaking change is approved.
 * @type {ReadonlyArray<{ version: string }>}
 */
export const SCHEMA_VERSIONS = Object.freeze([
  { version: "1.0" },
]);

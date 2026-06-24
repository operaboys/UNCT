/**
 * SubscriptionParser — public entry point (04-PARSER_ENGINE Stage 08).
 * @module core/parser/subscription
 */
export {
  subscriptionParser, registerSubscriptionParser, parseSubscription,
} from "./subscription-parser.js";
export { detectSubscription } from "./detect.js";
export { decodeSubscription, isUrlLine } from "./decode.js";
export { extractSubscription, splitAndDedupe } from "./extract.js";
export { normalizeSubscription, normalizeMany, normalizeRefuse } from "./normalize.js";
export { recoverSubscription } from "./recover.js";

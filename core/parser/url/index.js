/**
 * URLParser — public entry point (04-PARSER_ENGINE Stage 07 + Stage 12).
 * @module core/parser/url
 */
export { urlParser, registerUrlParser } from "./url-parser.js";
export { detectUrl } from "./detect.js";
export { preprocessUrl, URL_SCHEMES } from "./preprocess.js";
export { parseUrl, decodeBase64, SCHEME_PROTOCOL } from "./extract.js";
export { normalizeUrl, PRIORITY_CHAINS, PARSER_NAME } from "./normalize.js";
export { recoverUrl } from "./recover.js";

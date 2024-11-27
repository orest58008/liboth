/**
 * @module
 * 
 * This library convert Org to HTML. Use orgToHtml for most convenience.
 * 
 * @example
 * ```ts
 * import { orgToHtml } from "@orest58008/liboth"
 * 
 * orgToHtml("*Hello world!*") // { head: [], body: "<p><b>Hello world!</b></p>" }
 * ```
 */

import { lexLines } from "./lexer.ts"
import { type Html, parseElements } from "./parser.ts";

export { type Element, lexLines } from "./lexer.ts"
export { type Html, parseElements } from "./parser.ts"

/**
 * Wrapper function for convenient use
 * @param org raw Org string
 * @returns HTML output wrapped in Html interface
 */
export function orgToHtml(org: string): Html {
   return parseElements(lexLines(org.split(/\n/)))
}
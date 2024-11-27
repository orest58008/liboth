import { lexLines } from "./lexer.ts"
import { type Html, parseElements } from "./parser.ts";

export { type Element, lexLines } from "./lexer.ts"
export { type Html, parseElements } from "./parser.ts"

/**
 * Wrapper function for convenient use
 * @param org raw org string
 * @returns HTML output wrapped in Html interface
 */
export function orgToHtml(org: string): Html {
   return parseElements(lexLines(org.split(/\n/)))
}
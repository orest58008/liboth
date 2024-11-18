import { parseByLines } from "./main.ts";

console.log (
   parseByLines(Deno.readTextFileSync("./README.org").split(/\n/))
)
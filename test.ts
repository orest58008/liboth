import * as lexer from "./lexer.ts"
import * as parser from "./parser.ts"

const lexer_out =
   lexer.parseByLines(Deno.readTextFileSync("./TEST.org").split(/\n/))

const parser_out =
   parser.parseByElement(lexer_out)

console.log(lexer_out)
Deno.writeTextFileSync("./TEST.html", parser_out.join('\n'))
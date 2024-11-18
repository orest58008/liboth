import * as lexer from "./lexer.ts"
import * as parser from "./parser.ts"

const lexer_out =
   lexer.parseByLines(Deno.readTextFileSync("./README.org").split(/\n/))

const parser_out =
   parser.parseByElement(lexer_out)

console.log(Deno.writeTextFileSync("./README.html", parser_out.join('\n')))
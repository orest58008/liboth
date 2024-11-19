import * as lexer from "./lexer.ts"
import * as parser from "./parser.ts"

const file = Deno.args[0]

const lexer_out =
   lexer.lexLines(Deno.readTextFileSync(file).split(/\n/))

const parser_out =
   parser.parseElements(lexer_out)

Deno.writeTextFileSync(file.replace("org", "html"), parser_out.join('\n'))
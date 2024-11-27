import * as lexer from "./lexer.ts"
import * as parser from "./parser.ts"

const file = Deno.args[0]

const lexer_out =
   lexer.lexLines(Deno.readTextFileSync(file).split(/\n/))

console.debug(lexer_out)

const parser_out =
   parser.parseElements(lexer_out)

Deno.writeTextFileSync(file.replace("org", "html"), `\
<!doctype html>
<html>
<head>${parser_out.head.join('')}</head>
<body>${parser_out.body.join('')}</body>
</html>`)
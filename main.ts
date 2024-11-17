enum Tag {
   Empty = "",

   Title = "title",

   BlockStart = "div",
   BlockEnd = "/div",
   ListStart = "l",
   ListEnd = "/l",

   Heading = "h",
   HorizontalRule = "hr",
   ListItem = "li",
   Paragraph = "p",

   Bold = "b",
   Code = "code",
   Italic = "i",
   StrikeThrough = "s",
}

interface ElementOptions {
   BlockClass?: string,
   HeadingLevel?: number,
   ListItemLevel?: number,
   ListItemIndex?: number,
}

interface Element {
   tag: Tag,
   options?: ElementOptions,
   content?: string,
}

export function parseByLines(lines: string[]): Element[] {
   const result: Element[] = []

   // define a table of tag conditions
   const lineToElement: [RegExp, (_: string) => Element][] = [
      [/^#\+TITLE:\s*/i, (_: string): Element => {    // Title
         return { tag: Tag.Title }
      }],
      [/^#\+BEGIN_/i, (_: string): Element => {       // Block Start
         return {
            tag: Tag.BlockStart,
         }
      }],
      [/^#\+END_/i, (_: string): Element => {         // Block End
         return {
            tag: Tag.BlockEnd,
         }
      }],
      [/^\*+\s+/, (line: string): Element => {        // Heading
         return {
            tag: Tag.Heading,
            options: { HeadingLevel: /^\*+/.exec(line)![0].length }
         }
      }],
      [/^-{5}/, (_: string): Element => {             // Horizontal Rule
         return { tag: Tag.HorizontalRule }
      }],
      [/^\s*[-+*]\s+/, (line: string): Element => {   // List Item (Unordered)
         return {
            tag: Tag.ListItem,
            content: line.replace(/[-+*]\s+/, "")
         }
      }],
      [/^\s*\d+[.)]\s+/, (line: string): Element => { // List Item (Ordered)
         return {
            tag: Tag.ListItem,
            content: line.replace(/\d+[.)]\s+/, ""),
            options: { ListItemIndex: +/\d+/.exec(line)![0] }
         }
      }],
      [/^$/, (_: string): Element => {                // Empty Line
         return { tag: Tag.Empty }
      }],
      [/.*/, (line: string): Element => {             // Paragraph (Text)
         return {
            tag: Tag.Paragraph,
            content: line
         }
      }],
   ]

   // initial conversion of raw strings into Element format
   for (const line of lines) {
      const match = lineToElement.find((elem => elem[0].test(line)))
      if (!match) continue

      const cond = match[0], func = match[1]

      const element = func(line).content
         ? func(line)
         : { ...func(line), content: line.replace(cond, "") }

      if (element.tag == Tag.BlockStart || element.tag == Tag.BlockEnd) {
         element.options = { BlockClass: line.replace(cond, "").replace(/\s.*/, "").toLowerCase() }
         element.content! = line.replace(cond, "").replace(/[\w]+\s*/, "")
      }

      result.push(element)
   }

   // sliding window post-processing
   for (let index = 0; index < result.length; index++) {
      const element = result[index]
      const prev = result[index - 1]

      if (element.tag == Tag.Paragraph) {
         // propagate "src" class through code
         if (prev.tag != Tag.BlockEnd && prev.options?.BlockClass == "src")
            element.options = { ...element.options, BlockClass: "src" }

         // join paragraphs that aren't separated by an empty line or an `\\`
         if (prev.tag == Tag.Paragraph && !/.*\\{2}$/.test(prev.content!)) {
            const separator = (() => {
               switch (true) {
                  case prev.options?.BlockClass == "src": return '\n'
                  default: return ' '
               }
            })()

            result.splice(index - 1, 2,
               { ...prev, content: prev.content?.concat(separator, element.content!) })

            index -= 1
         }
      }
   }

   // return result without empty lines
   return result.filter((element) => element.tag != Tag.Empty)
}

console.log (
   parseByLines(Deno.readTextFileSync("./README.org").split(/\n/))
)
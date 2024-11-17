enum TagName {
   Empty = "",

   Title = "title",

   BlockStart = "div",
   BlockEnd = "/div",
   ListStart = "l",
   ListEnd = "/l",

   Heading = "h",
   ListItem = "li",
   Paragraph = "p",

   Bold = "b",
   Code = "code",
   Italic = "i",
   StrikeThrough = "s",
}

interface TagOptions {
   BlockClass?: string,
   HeadingLevel?: number,
   ListItemLevel?: number,
   ListItemIndex?: number,
}

interface Tag {
   name: TagName,
   options?: TagOptions,
   content?: string,
}

export function parseByLines(lines: string[]): Tag[] {
   const result: Tag[] = []

   const lineToTag: [RegExp, (_: string) => Tag][] = [
      [/^#\+TITLE:\s*/i, (_: string): Tag => {    // Title
         return { name: TagName.Title }
      }],
      [/^#\+BEGIN_/i, (_: string): Tag => {       // Block Start
         return {
            name: TagName.BlockStart,
         }
      }],
      [/^#\+END_/i, (_: string): Tag => {         // Block End
         return {
            name: TagName.BlockEnd,
         }
      }],
      [/^\*+\s+/, (line: string): Tag => {        // Heading
         return {
            name: TagName.Heading,
            options: { HeadingLevel: /^\*+/.exec(line)![0].length }
         }
      }],
      [/^\s*[-+*]\s+/, (line: string): Tag => {   // List Item (Unordered)
         return {
            name: TagName.ListItem,
            content: line.replace(/[-+*]\s+/, "")
         }
      }],
      [/^\s*\d+[.)]\s+/, (line: string): Tag => { // List Item (Ordered)
         return {
            name: TagName.ListItem,
            content: line.replace(/\d+[.)]\s+/, ""),
            options: { ListItemIndex: +/\d+/.exec(line)![0] }
         }
      }],
      [/^$/, (_: string): Tag => {                // Empty Line
         return { name: TagName.Empty }
      }],
      [/.*/, (line: string): Tag => {             // Paragraph (Text)
         return {
            name: TagName.Paragraph,
            content: line
         }
      }],
   ]

   for (const line of lines) {
      const match = lineToTag.find((elem => elem[0].test(line)))
      if (!match) continue

      const cond = match[0], func = match[1]

      const tag = func(line).content
         ? func(line)
         : { ...func(line), content: line.replace(cond, "") }
      
      if (tag.name == TagName.BlockStart || tag.name == TagName.BlockEnd) {
         tag.options = {
            ...tag.options,
            BlockClass: line.replace(cond, "").replace(/\s.*/, "").toLowerCase()
         }
         tag.content! = line.replace(cond, "").replace(/[\w]+\s*/, "")
      }

      result.push(tag)
   }

   for (let index = 0; index < result.length; index++) {
      const tag = result[index]
      const prev = result[index - 1]

      if (tag.name == TagName.Paragraph) {
         if (prev.name != TagName.BlockEnd && prev.options?.BlockClass == "src")
            tag.options = {
               ...tag.options,
               BlockClass: "src"
            }

         if (prev.name == TagName.Paragraph) {
            const separator = (() => {
               switch (true) {
                  case prev.options?.BlockClass == "src": return '\n'
                  default: return ' '
               }
            })()

            result.splice(index - 1, 2,
               { ...prev, content: prev.content?.concat(separator, tag.content!) })

            index -= 1
         }
      }
   }

   for (const tag of result) {
      const index = result.indexOf(tag)
      if (tag.name == TagName.Empty) result.splice(index, 1)
   }

   return result
}

console.log (
   parseByLines(Deno.readTextFileSync("./README.org").split("\n"))
)
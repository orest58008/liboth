export enum Tag {
   Empty = "",

   Title = "title",

   BlockStart = "div",
   BlockEnd = "/div",
   OrderedListStart = "ol",
   OrderedListEnd = "/ol",
   UnorderedListStart = "ul",
   UnorderedListEnd = "/ul",

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

export interface Element {
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
      [/^-+$/, (_: string): Element => {              // Horizontal Rule
         return { tag: Tag.HorizontalRule }
      }],
      [/^\s*[-+*]\s+/, (line: string): Element => {   // List Item (Unordered)
         return {
            tag: Tag.ListItem,
            content: line.replace(/[-+*]\s+/, ""),
            options: {
               ListItemLevel: /^\s+/.test(line) ? /\s+/.exec(line)![0].length : 0
            }
         }
      }],
      [/^\s*\d+[.)]\s+/, (line: string): Element => { // List Item (Ordered)
         return {
            tag: Tag.ListItem,
            content: line.replace(/\d+[.)]\s+/, ""),
            options: {
               ListItemIndex: +/\d+/.exec(line)![0],
               ListItemLevel: /^\s+/.test(line) ? /\s+/.exec(line)![0].length : 0
            }
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
      if (/^#\s/.test(line)) continue

      const match = lineToElement.find((elem => elem[0].test(line)))
      if (!match) continue

      const cond = match[0], func = match[1]

      const element = func(line).content
         ? func(line)
         : { ...func(line), content: line.replace(cond, "") }

      if (element.tag == Tag.BlockStart || element.tag == Tag.BlockEnd) {
         element.options = { BlockClass: line.replace(cond, "").replace(/\s.*/, "").toLowerCase() }
         element.content = line.replace(cond, "").replace(/[\w]+\s*/, "")
      }

      result.push(element)
   }

   // sliding window post-processing
   for (let index = 0; index < result.length; index++) {
      const elem = result[index]
      const prev = result[index - 1]
      const next = result[index + 1]
     
      switch (elem.tag) {
         case Tag.Paragraph:
            // propagate BlockClass
            if (prev?.tag != Tag.BlockEnd && prev.options?.BlockClass)
               elem.options = { ...elem.options, BlockClass: prev.options?.BlockClass }

            // join paragraphs that aren't separated by an empty line or `\\`
            if (prev?.tag == Tag.Paragraph && !/.*\\{2}$/.test(prev.content!)) {
               const separator = (() => {
                  switch (true) {
                     case prev.options?.BlockClass == "src": return "\n"
                     default: return ' '
                  }
               })()

               result.splice(index - 1, 2,
                  { ...prev, content: prev.content?.concat(separator, elem.content!) })

               index -= 1
            }


            break;

         case Tag.ListItem:
            // create ListStart
            if (prev?.tag != Tag.ListItem) {
               const tag = elem.options?.ListItemIndex
                  ? Tag.OrderedListStart
                  : Tag.UnorderedListStart

               result.splice(index, 0, { tag: tag })
               index += 1
            }

            // create ListEnd
            if (next?.tag != Tag.ListItem) {
               const tag = elem.options?.ListItemIndex
                  ? Tag.OrderedListEnd
                  : Tag.UnorderedListEnd

               result.splice(index + 1, 0, { tag: tag })
               index += 1
            }
      }
   }

   // ListItemLevel normalisation
   const ListItemLevels: number[] = [];
   let insideList: boolean = false;

   for (const elem of result) {
      if (elem.tag == Tag.OrderedListStart || elem.tag == Tag.UnorderedListStart)
         insideList = true
      else if (elem.tag == Tag.OrderedListEnd || elem.tag == Tag.UnorderedListEnd)
         insideList = false
      else if (
         insideList &&
         elem.tag == Tag.ListItem &&
         !ListItemLevels.includes(elem.options?.ListItemLevel!)
      ) ListItemLevels.push(elem.options?.ListItemLevel!)
   }

   ListItemLevels.toSorted((a, b) => a - b)

   result.map((elem) => {
      if (elem.options?.ListItemLevel)
         elem.options.ListItemLevel = ListItemLevels.indexOf(elem.options.ListItemLevel)
   })

   // return result without empty lines
   return result.filter((e) =>
      e.tag != Tag.Empty && e.options?.BlockClass != "comment"
   )
}
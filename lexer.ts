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

export function lexLines(lines: string[]): Element[] {
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
   let paragraph: string[] = []
   const ListItemLevels: number[] = []
   let insideList: boolean = false

   return lines
      .filter((e) => !/^#\s/.test(e))
      .map((line) => {
         const match = lineToElement.find((elem => elem[0].test(line)))

         const cond = match![0], func = match![1]

         const element = func(line).content
            ? func(line)
            : { ...func(line), content: line.replace(cond, "") }

         if (element.tag == Tag.BlockStart || element.tag == Tag.BlockEnd) {
            element.options = {
               BlockClass: line.replace(cond, "").replace(/\s.*/, "").toLowerCase()
            }
            element.content = line.replace(cond, "").replace(/[\w]+\s*/, "")
         }

         return element
      })
      .flatMap((elem, index, array): Element | Element[] => {
         const prev = array[index - 1]
         const next = array[index + 1]

         const content = elem.content?.trim()
         const prev_content = prev?.content?.trim()
         let tag: Tag

         switch (true) {
            case elem.tag == Tag.Paragraph:
               // propagate BlockClass
               if (prev?.tag != Tag.BlockEnd && prev.options?.BlockClass)
                  elem.options = { ...elem.options, BlockClass: prev.options?.BlockClass }

               // join paragraphs that aren't separated by an empty line
               if (prev?.tag == Tag.Paragraph) {
                  const separator = (() => {
                     switch (true) {
                        case prev.options?.BlockClass == "src": return "<br>"
                        default: return ' '
                     }
                  })()

                  if (!paragraph.length)
                     paragraph.push(prev_content!, content!)
                  else
                     paragraph.push(content!)

                  if (next?.tag != Tag.Paragraph) {
                     const content = paragraph.join(separator)
                     paragraph = []

                     return { ...elem, content: content }
                  }
               }

               break

            // Insert ListItemStart
            case elem.tag == Tag.ListItem && prev?.tag != Tag.ListItem:
               tag = elem.options?.ListItemIndex
                  ? Tag.OrderedListStart
                  : Tag.UnorderedListStart

               return [{ tag: tag }, elem]

            // Insert ListItemEnd
            case elem.tag == Tag.ListItem && next?.tag != Tag.ListItem:
               tag = elem.options?.ListItemIndex
                  ? Tag.OrderedListEnd
                  : Tag.UnorderedListEnd

               return [elem, { tag: tag }]

            case true:
               return elem
         }
         return { tag: Tag.Empty }
      })
      .map((elem) => {
         if (elem.tag == Tag.OrderedListStart || elem.tag == Tag.UnorderedListStart)
            insideList = true
         else if (elem.tag == Tag.OrderedListEnd || elem.tag == Tag.UnorderedListEnd)
            insideList = false
         else if (
            insideList &&
            elem.tag == Tag.ListItem &&
            !ListItemLevels.includes(elem.options?.ListItemLevel!)
         ) ListItemLevels.push(elem.options?.ListItemLevel!)

         return (elem)
      })
      .map((elem) => {
         if (!elem.options?.ListItemLevel) return elem

         ListItemLevels.toSorted((a, b) => a - b)

         return {
            ...elem,
            options: {
               ...elem.options,
               ListItemLevel: ListItemLevels.indexOf(elem.options?.ListItemLevel!)
            }
         }
      })
      .filter((elem) =>
         elem.tag != Tag.Empty && elem.options?.BlockClass != "comment"
      )
}
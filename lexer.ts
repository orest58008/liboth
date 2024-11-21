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

interface ElementTransformer {
   condition: RegExp,
   transformer: (_: string) => Element,
}

export function lexLines(lines: string[]): Element[] {
   // define a table of tag conditions
   const lineToElement: ElementTransformer[] = [
      { // Title
         condition: /^#\+TITLE:\s*/i,
         transformer: () => { return { tag: Tag.Title } }
      },
      { // BlockStart
         condition: /^#\+BEGIN_/i,
         transformer: () => { return { tag: Tag.BlockStart } }
      },
      { // BlockEnd
         condition: /^#\+END_/i,
         transformer: () => { return { tag: Tag.BlockEnd } }
      },
      { // Heading
         condition: /^\*+\s+/,
         transformer: (line): Element => {
            return {
               tag: Tag.Heading,
               options: { HeadingLevel: /^\*+/.exec(line)![0].length }
            }
         }
      },
      { // HorizontalRule
         condition: /^-+$/,
         transformer: () => { return { tag: Tag.HorizontalRule } }
      },
      { // ListItem (Unordered)
         condition: /^\s*[-+*]\s+/,
         transformer: (line): Element => {
            return {
               tag: Tag.ListItem,
               content: line.replace(/[-+*]\s+/, ""),
               options: { ListItemLevel: /^\s+/.test(line) ? /\s+/.exec(line)![0].length : 0 }
            }
         }
      },
      { // ListItem (Ordered)
         condition: /^\s*\d+[.)]\s+/,
         transformer: (line): Element => {
            return {
               tag: Tag.ListItem,
               content: line.replace(/\d+[.)]\s+/, ""),
               options: {
                  ListItemIndex: +/\d+/.exec(line)![0],
                  ListItemLevel: /^\s+/.test(line) ? /\s+/.exec(line)![0].length : 0
               }
            }
         }
      },
      { // Empty line
         condition: /^$/,
         transformer: () => { return { tag: Tag.Empty } }
      },
      { // Paragraph (everything else)
         condition: /.*/,
         transformer: (line: string): Element => { return { tag: Tag.Paragraph, content: line } }
      },
   ] as const

   let paragraph: string[] = []
   const ListItemLevels: number[] = []
   let insideList: boolean = false

   return lines
      // remove # comments
      .filter((e) => !/^#\s/.test(e))
      // convert raw strings into Elements
      .map((line) => {
         const match = lineToElement.find((tran => tran.condition.test(line)))

         const cond = match!.condition, func = match!.transformer

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
      // fine processing
      .flatMap((elem, index, array): Element | Element[] => {
         const prev = array[index - 1]
         const next = array[index + 1]

         const content = elem.content?.trim()
         const prev_content = prev?.content?.trim()
         let tag: Tag

         switch (true) {
            case elem.tag == Tag.Paragraph:
               if (prev?.tag != Tag.BlockEnd && prev.options?.BlockClass)  // propagate BlockClass
                  elem.options = { ...elem.options, BlockClass: prev.options?.BlockClass }

               if (prev?.tag == Tag.Paragraph) {    // join paragraphs that aren't separated by an
                  const separator = (() => {                                         // empty line
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

            // insert ListItemStart
            case elem.tag == Tag.ListItem && prev?.tag != Tag.ListItem:
               tag = elem.options?.ListItemIndex
                  ? Tag.OrderedListStart
                  : Tag.UnorderedListStart

               return [{ tag: tag }, elem]

            // insert ListItemEnd
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
      // collect ListItemLevels
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
      // normalise ListItemLevel
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
      // remove empty lines and comments
      .filter((elem) =>
         elem.tag != Tag.Empty && elem.options?.BlockClass != "comment"
      )
}
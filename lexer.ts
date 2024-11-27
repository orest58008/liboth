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

/** Internal AST type for communication between lexLines and parseElements */
export interface Element {
   tag: Tag,
   options?: ElementOptions,
   content?: string,
}

interface ElementTransformer {
   condition: RegExp,
   transformer: (_: string) => Element,
}

/**
 * Converts HTML into an array of AST tokens that are accepted by parseElements.
 * @param lines HTML source split by lines (by '\n')
 * @returns AST token representation of input HTML
 */
export function lexLines(lines: string[]): Element[] {
   // define a table of tag conditions
   const LINE_TO_ELEMENT: ElementTransformer[] = [
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
   const ListItemLevels: number[][] = []
   let listNumber: number = -1

   return lines
      // remove # comments
      .filter((e) => !/^#\s/.test(e))
      // convert raw strings into Elements
      .map((line) => {
         const match = LINE_TO_ELEMENT.find((tran => tran.condition.test(line)))

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
      // post-processing
      .flatMap((elem, index, array) => {
         const prev = array[index - 1]
         const next = array[index + 1]

         let tag: Tag

         switch (true) {
            // propagate BlockClass and join paragraphs
            case (elem.tag == Tag.Paragraph):
               paragraph.push(elem.content?.trim()!)

               if (prev.options?.BlockClass != undefined && prev.tag != Tag.BlockEnd)
                  elem.options = { ...elem.options, BlockClass: prev.options.BlockClass }

               if (next == undefined || next.tag != Tag.Paragraph) {
                  const separator = prev.options?.BlockClass == "src" ? "<br>" : " "
                  const content = paragraph.join(separator)
                  paragraph = []
                  return { ...elem, content: content }
               }

               return { tag: Tag.Empty }

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
         switch (elem.tag) {
            case Tag.OrderedListStart: case Tag.UnorderedListStart:
               listNumber += 1
               ListItemLevels.push([])
               break

            case Tag.UnorderedListEnd: case Tag.OrderedListEnd:
               ListItemLevels[listNumber].toSorted((a, b) => a - b)
               break

            case Tag.ListItem:
               ListItemLevels[listNumber].push(elem.options?.ListItemLevel!)
         }

         return elem
      })
      // normalise ListItemLevel
      .map((elem) => {
         const ListItemLevel = elem.options?.ListItemLevel

         if (!ListItemLevel) return elem

         return {
            ...elem,
            options: {
               ...elem.options, ListItemLevel: ListItemLevels[listNumber].indexOf(ListItemLevel)
            }
         }
      })
      // remove empty lines and comments
      .filter((elem) =>
         elem.tag != Tag.Empty && elem.options?.BlockClass != "comment"
      )
}
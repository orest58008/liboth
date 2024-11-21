import { Element, Tag } from "./lexer.ts";

function parseLine(line: string): string {
   let link: string[] = []

   const style = {
      link: false,
      bold: false,
      code: false,
      italic: false,
      strikeThrough: false,
      underlined: false,
      verbatim: false,
   }

   return line.split('')
      .map((char, index, array) => {
         const next: string = array[index + 1]
         const prev: string = array[index - 1]

         switch (true) {
            case char == "=":
               style.verbatim = !style.verbatim
               return style.verbatim ? "<code>" : "</code>"
            case style.verbatim:
               return char

            case char == "\\":
               if (next == "\\") return ""
               if (prev == "\\") return "<br>"
               else return "\\"

            case char == "[":
               if (prev == "[" || prev == "]") return ""
               else if (next == "[") {
                  style.link = true
                  link = []
                  return '<a href="'
               } else return "["
            case char == "]":
               if (prev == "]") return ""

               if (next == "[") {
                  style.link = false
                  return '">'
               } else if (next == "]" && style.link) {
                  style.link = false
                  return '">' + link.join('') + "</a>"
               } else if (next == "]") {
                  style.link = false
                  return "</a>"
               }
               else return "]"
            case style.link:
               link.push(char)
               return char

            case char == "*":
               style.bold = !style.bold
               return style.bold ? "<b>" : "</b>"
            case char == "/":
               style.italic = !style.italic
               return style.italic ? "<i>" : "</i>"
            case char == "_":
               style.underlined = !style.underlined
               return style.underlined ? "<u>" : "</u>"
            case char == "+":
               style.strikeThrough = !style.strikeThrough
               return style.strikeThrough ? "<s>" : "</s>"
            case char == "~":
               style.code = !style.code
               return style.code ? "<code>" : "</code>"

            case true:
               return char
         }
      }).join('')
}

export interface html {
   head: string[],
   body: string[],
}

export function parseElements(elements: Element[]): html {
   const blockTags: Tag[] = [
      Tag.BlockStart, Tag.BlockEnd,
      Tag.OrderedListStart, Tag.OrderedListEnd,
      Tag.UnorderedListStart, Tag.UnorderedListEnd,
   ] as const

   const headTags: Tag[] = [
      Tag.Title
   ] as const

   interface resultCandidate {
      isHead: boolean,
      result: string
   }

   let ListOpen: number = 0

   const allResults: resultCandidate[] = elements
      .map((element, index, elements) => {
         const next = elements[index + 1]
         const content = element.content?.trim()
         const options = element.options
         const tag = element.tag

         switch (true) {
            case blockTags.includes(tag):
               return {
                  isHead: headTags.includes(tag),
                  result: [
                     "<",
                     tag,
                     tag.includes("/") ? ">" :
                        options?.BlockClass ? ` class="${options.BlockClass}">` : ">",
                  ].join('')
               }
            case tag == Tag.ListItem:
               if (
                  next.tag == Tag.ListItem &&
                  next.options?.ListItemLevel! > options?.ListItemLevel!
               ) {
                  ListOpen += 1                  

                  return {
                     isHead: false,
                     result: [
                        "<li>",
                        content,
                        "<ul>"
                     ].join('')
                  }
               } else if (
                  next.tag != Tag.ListItem ||
                  next.options?.ListItemLevel! < options?.ListItemLevel!
               ) {
                  const tempListOpen = ListOpen
                  ListOpen = 0

                  return {
                     isHead: false,
                     result: [
                        "<", tag, ">",
                        content,
                        "</", tag, ">",
                        "</ul></li>".repeat(tempListOpen)
                     ].join('')
                  }
               } else {
                  return {
                     isHead: headTags.includes(tag),
                     result: [
                        "<", tag, ">",
                        content,
                        "</", tag, ">"
                     ].join('')
                  }
               }
            case content != '':
               return {
                  isHead: headTags.includes(tag),
                  result: [
                     "<",
                     tag,
                     options?.HeadingLevel ? options.HeadingLevel : "",
                     options?.BlockClass ? ` class="${options.BlockClass}">` : ">",
                     options?.BlockClass ? content : parseLine(content!),
                     "</",
                     tag,
                     options?.HeadingLevel ? options.HeadingLevel : "",
                     ">"
                  ].join('')
               }
            default:
               return {
                  isHead: headTags.includes(tag),
                  result: "<" + tag + ">"
               }
         }
      })

   return {
      head: allResults.map((e) => e.isHead ? e.result : "").filter((e) => e != ""),
      body: allResults.map((e) => e.isHead ? "" : e.result).filter((e) => e != ""),
   }
}
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

            case char == "\\" && next == "\\":
               if (prev == "\\") return ""
               return "<br>"

            case char == "[":
               if (prev == "[" || prev == "]") return ""
               else if (next == "[") {
                  style.link = true
                  link = []
                  return '<a href="'
               } else return "["
            case char == "]":
               if (prev == "]") return ""
               else if (next == "[") {
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

export function parseElements(elements: Element[]): string[] {
   const blockTags: Tag[] = [
      Tag.BlockStart, Tag.BlockEnd,
      Tag.OrderedListStart, Tag.OrderedListEnd,
      Tag.UnorderedListStart, Tag.UnorderedListEnd,
   ]

   return elements
      .map((element) => {
         const content = element.content?.trim()
         const options = element.options
         const tag = element.tag

         switch (true) {
            case blockTags.includes(tag):
               return [
                  "<",
                  tag,
                  tag.includes("/") ? ">" :
                     options?.BlockClass ? ` class="${options.BlockClass}">` : ">",
               ].join('')
            case content != '':
               return [
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
            default: return "<" + tag + ">"
         }
      }).filter((e) => e != "")
}
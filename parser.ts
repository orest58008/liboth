import { Element, Tag } from "./lexer.ts";

function parseLine(line: string): string {
   const result: string[] = []
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

   for (let index = 0; index < line.length; index += 1) {
      const char: string = line[index]
      const next: string = line[index + 1]

      switch (true) {
         case char == "=":
            style.verbatim = !style.verbatim
            result.push(style.verbatim ? "<code>" : "</code>")
            break
         case style.verbatim:
            result.push(char)
            break

         case char == "\\" && next == "\\":
            result.push("<br>")
            index += 1
            break

         case char == "[" && next == "[":
            result.push(`<a href="`)
            style.link = true; link = []
            index += 1
            break
         case char == "]" && next == "[":
            result.push(`">`)
            style.link = false
            index += 1
            break
         case char == "]" && next == "]":
            if (style.link) result.push(`">` + link.join(''))
            result.push("</a>")
            style.link = false
            index += 1
            break
         case style.link:
            result.push(char)
            link.push(char)
            break

         case char == "*":
            style.bold = !style.bold
            result.push(style.bold ? "<b>" : "</b>")
            break
         case char == "/":
            style.italic = !style.italic
            result.push(style.italic ? "<i>" : "</i>")
            break
         case char == "_":
            style.underlined = !style.underlined
            result.push(style.underlined ? "<u>" : "</u>")
            break
         case char == "+":
            style.strikeThrough = !style.strikeThrough
            result.push(style.strikeThrough ? "<s>" : "</s>")
            break
         case char == "~":
            style.code = !style.code
            result.push(style.code ? "<code>" : "</code>")
            break

         case true:
            result.push(char)
      }
   }

   return result.join('')
}

export function parseElements(elements: Element[]): string[] {
   const blockTags: Tag[] = [
      Tag.BlockStart, Tag.BlockEnd,
      Tag.OrderedListStart, Tag.OrderedListEnd,
      Tag.UnorderedListStart, Tag.UnorderedListEnd,
   ]

   const result: string[] = elements.map((element) => {
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
   })

   return result.filter((e) => e != "")
}
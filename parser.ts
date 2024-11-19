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
      underline: false,
      verbatim: false,
   }

   for (let index = 0; index < line.length; index += 1) {
      const char: string = line[index]
      const next: string = line[index + 1]

      switch (true) {
         case char == "=" && !style.verbatim:
            style.verbatim = true
            result.push("<code>")
            break
         case char == "=":
            style.verbatim = false
            result.push("</code>")
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

         case char == "*" && !style.bold:
            result.push("<b>")
            style.bold = true
            break
         case char == "*":
            result.push("</b>")
            style.bold = false
            break

         case char == "/" && !style.italic:
            result.push("<i>")
            style.italic = true
            break
         case char == "/":
            result.push("</i>")
            style.italic = false
            break

         case char == "_" && !style.underline:
            result.push("<u>")
            style.underline = true
            break
         case char == "_":
            result.push("</u>")
            style.underline = false
            break

         case char == "~" && !style.code:
            style.code = true
            result.push("<code>")
            break
         case char == "~":
            style.code = false
            result.push("</code>")
            break

         case char == "+" && !style.strikeThrough:
            style.strikeThrough = true
            result.push("<s>")
            break
         case char == "+":
            style.strikeThrough = false
            result.push("</s>")
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
      const content = element.content
      const options = element.options
      const tag = element.tag

      if (blockTags.includes(tag))
         return [
            "<",
            tag,
            tag.includes("/") ? ">" :
               options?.BlockClass ? ` class="${options.BlockClass}">` : ">",
         ].join('')

      if (content)
         return [
            "<",
            tag,
            options?.HeadingLevel ? options.HeadingLevel : "",
            options?.BlockClass ? ` class="${options.BlockClass}">` : ">",
            options?.BlockClass ? content : parseLine(content),
            "</",
            tag,
            options?.HeadingLevel ? options.HeadingLevel : "",
            ">"
         ].join('')

      return "<" + tag + ">"
   })

   return result.filter((e) => e != "")
}
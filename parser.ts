import { Element, Tag } from "./lexer.ts";

export function parseByElement(elements: Element[]): string[] {
   const blockTags: Tag[] = [
      Tag.BlockStart, Tag.BlockEnd,
      Tag.OrderedListStart, Tag.OrderedListEnd,
      Tag.UnorderedListStart, Tag.UnorderedListEnd,
   ]

   const result: string[] = elements.map((element) => {
      const content = element.content
      const options = element.options
      const tag = element.tag.toString()

      if (blockTags.find((e) => e == tag))
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
            content.replace(/\n/g, "<br>"),
            "</",
            tag,
            options?.HeadingLevel ? options.HeadingLevel : "",
            ">"
         ].join('')

      return "<" + tag + ">"
   })

   return result.filter((e) => e != "")
}
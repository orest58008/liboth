import { Element, Tag } from "./lexer.ts";

function parseLine(line: string): string {
   class Link {
      constructor(urlFlag: boolean) {
         this.urlFlag = urlFlag
         this.url = []
         this.textFlag = false
         this.text = []
      }

      urlFlag: boolean = false
      url: string[] = []
      textFlag: boolean = false
      text: string[] = []
   }
   let link: Link = new Link(false)

   const IMAGE_FORMATS = [
      ".apng", ".avif",
      ".bmp",
      ".cur",
      ".exif", ".exr",
      ".flif",
      ".gif", ".giff",
      ".heic", ".heif",
      ".ico",
      ".j2k", ".jfif", ".jpeg", ".jpg", ".jpx", ".jxl",
      ".png",
      ".qoi",
      ".svg", ".svgz",
      ".tif", ".tiff",
      ".webp",
   ] as const

   let verbatim = false
   const styles: string[] = []
   const INLINE_STYLES = [
      ["*", "b"], ["/", "i"], ["+", "s"], ["_", "u"], ["~", "code"],
   ] as const

   return line.split('')
      .map((char, index, array) => {
         const next: string = array[index + 1]
         const prev: string = array[index - 1]

         switch (true) {
            case char == "=":
               if (next == "=") return ""
               if (prev == "=") return "="
               verbatim = !verbatim
               return verbatim ? "<code>" : "</code>"
            case verbatim:
               return char

            case char == "\\":
               if (prev == "\\") return ""
               if (next == "\\") return "<br>"
               return "\\"

            case char == "[":
               if (next == "[") return ""
               else if (prev == "[") link = new Link(true)
               else if (prev == "]") link.textFlag = !(link.urlFlag = false)
               else return "["
               return ""
            case char == "]":
               if (next == "[" || next == "]") return ""
               else if (prev == "]") {
                  const url = link.url.join(''), text = link.text.join('')
                  link = new Link(false)
                  if (IMAGE_FORMATS.some((f) => url.endsWith(f)))
                     return `<img src="${url}" alt="${text}" />`
                  else
                     return `<a href="${url}">${text ? text : url}</a>`
               }
               else return "]"
            case link.urlFlag:
               link.url.push(char)
               return ""
            case link.textFlag:
               link.text.push(char)
               return ""

            case (INLINE_STYLES.some((e) => e[0] == char)): {
               if (next == char) return ""
               if (prev == char) return char

               const tag = INLINE_STYLES.find((e) => e[0] == char)![1]
               if (!styles.includes(char)) {
                  styles.push(char)
                  return `<${tag}>`
               } else {
                  styles.splice(styles.indexOf(char), 1)
                  return `</${tag}>`
               }
            }

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
/*
SVG 导出工具：根据元素模型生成矢量 SVG 字符串。
支持当前已注册的图形类型：矩形、文本、直线、曲线、圆形、图片、二维码、条码。
二维码/条码/图片通过渲染为 data URL 后以内嵌 <image> 方式导出。
*/

import type { IGraphicElement } from '@/types'
import type { RectElement } from '@/plugins/rect/rect'
import type { TextElement } from '@/plugins/text/text'
import type { LineElement } from '@/plugins/line/line'
import type { CurveElement } from '@/plugins/curve/curve'
import type { EllipseElement } from '@/plugins/ellipse/ellipse'
import type { ImageElement } from '@/plugins/image/image'
import type { QrcodeElement } from '@/plugins/qrcode/qrcode'
import type { BarcodeElement } from '@/plugins/barcode/barcode'

function fmt(value: number, digits = 2): string {
  const rounded = Number.isFinite(value) ? value : 0
  return String(Math.round(rounded * 10 ** digits) / 10 ** digits)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function groupTransform(element: IGraphicElement): string {
  const parts = [`translate(${fmt(element.x)}, ${fmt(element.y)})`]
  if (element.rotation) {
    parts.push(`rotate(${fmt(element.rotation)})`)
  }
  if (element.scaleX !== 1 || element.scaleY !== 1) {
    parts.push(`scale(${fmt(element.scaleX)}, ${fmt(element.scaleY)})`)
  }
  return parts.join(' ')
}

function wrapTransform(element: IGraphicElement, body: string): string {
  return `<g transform="${groupTransform(element)}">${body}</g>`
}

function roundedClipPath(id: string, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  return `<clipPath id="${id}"><rect x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" rx="${fmt(r)}" ry="${fmt(r)}" /></clipPath>`
}

function renderRect(element: RectElement): { defs: string; body: string } {
  const width = element.width
  const height = element.height
  const radius = Math.max(0, Math.min(element.cornerRadius, width / 2, height / 2))
  const strokeWidth = Math.max(0, element.strokeWidth)
  const stroke = element.stroke || 'none'
  let defs = ''
  let rectBody = ''

  if (element.backgroundImage) {
    // 有背景图片时隐藏填充色，与画布渲染保持一致
    const image = `<image x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" preserveAspectRatio="none" href="${escapeXml(element.backgroundImage)}" />`
    if (radius > 0) {
      const clipId = `clip-rect-bg-${element.id}`
      defs += roundedClipPath(clipId, width, height, radius)
      rectBody += `<g clip-path="url(#${clipId})">${image}</g>`
    } else {
      rectBody += image
    }
  } else {
    rectBody += `<rect x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" rx="${fmt(radius)}" ry="${fmt(radius)}" fill="${element.fill || 'none'}" stroke="${stroke}" stroke-width="${fmt(strokeWidth)}" />`
  }

  if (element.backgroundImage) {
    rectBody += `<rect x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" rx="${fmt(radius)}" ry="${fmt(radius)}" fill="none" stroke="${stroke}" stroke-width="${fmt(strokeWidth)}" />`
  }

  return { defs, body: wrapTransform(element, rectBody) }
}

function createTextMeasureContext(element: TextElement): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const fontStyle = element.fontStyle.includes('italic') ? 'italic' : 'normal'
  const fontWeight =
    element.fontStyle === '500' ? '500' : element.fontStyle.includes('bold') ? 'bold' : 'normal'
  ctx.font = `${fontStyle} ${fontWeight} ${element.fontSize}px ${element.fontFamily || 'Arial'}`
  return ctx
}

function renderText(element: TextElement): { defs: string; body: string } {
  const lines = String(element.text ?? '').split('\n')
  const lineHeight = element.fontSize * 1.2
  const lineCount = lines.length
  const textBlockHeight = (lineCount - 1) * lineHeight + element.fontSize

  let y = 0
  if (element.verticalAlign === 'middle') {
    y = Math.max(0, (element.height - textBlockHeight) / 2)
  } else if (element.verticalAlign === 'bottom') {
    y = Math.max(0, element.height - textBlockHeight)
  }

  const anchorMap: Record<TextElement['align'], string> = {
    left: 'start',
    center: 'middle',
    right: 'end',
    justify: 'start',
  }
  const textAnchor = anchorMap[element.align] ?? 'start'
  const fontStyle = element.fontStyle.includes('italic') ? 'italic' : 'normal'
  const fontWeight =
    element.fontStyle === '500' ? '500' : element.fontStyle.includes('bold') ? 'bold' : 'normal'
  const fontAttrs = `font-family="${escapeXml(element.fontFamily || 'Arial')}" font-size="${fmt(element.fontSize)}" font-style="${fontStyle}" font-weight="${fontWeight}" fill="${element.fill || '#000000'}"`

  // 文字间距不为 0 时，手动按字符计算坐标，避免 SVG letter-spacing 对对齐产生偏移
  const letterSpacing = element.letterSpacing || 0
  if (letterSpacing > 0) {
    const measureCtx = createTextMeasureContext(element)
    if (measureCtx) {
      const charNodes = lines
        .map((line, index) => {
          const chars = Array.from(line)
          const widths = chars.map((char) => measureCtx.measureText(char).width)
          const lineWidth =
            widths.reduce((sum, width) => sum + width, 0) + letterSpacing * chars.length
          let x = 0
          if (element.align === 'center') {
            x = Math.max(0, (element.width - lineWidth) / 2)
          } else if (element.align === 'right') {
            x = Math.max(0, element.width - lineWidth)
          }
          const yLine = y + index * lineHeight
          let cursorX = x
          return chars
            .map((char, charIndex) => {
              const node = `<text x="${fmt(cursorX)}" y="${fmt(yLine)}" text-anchor="start" dominant-baseline="text-before-edge" ${fontAttrs} xml:space="preserve">${escapeXml(char)}</text>`
              cursorX += widths[charIndex] + letterSpacing
              return node
            })
            .join('')
        })
        .join('')

      return { defs: '', body: wrapTransform(element, charNodes) }
    }
  }

  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? '0' : fmt(lineHeight)
      return `<tspan x="0" dy="${dy}">${escapeXml(line)}</tspan>`
    })
    .join('')

  const letterSpacingAttr = letterSpacing ? ` letter-spacing="${fmt(letterSpacing)}"` : ''
  const text = `<text x="0" y="${fmt(y)}" dominant-baseline="text-before-edge" text-anchor="${textAnchor}" ${fontAttrs}${letterSpacingAttr} xml:space="preserve">${tspans}</text>`

  return { defs: '', body: wrapTransform(element, text) }
}

function renderLine(element: LineElement): { defs: string; body: string } {
  const y = element.height / 2
  const dash = element.lineType === 'dashed' ? ' stroke-dasharray="4,2"' : ''
  const line = `<line x1="0" y1="${fmt(y)}" x2="${fmt(element.width)}" y2="${fmt(y)}" stroke="${element.stroke || '#000000'}" stroke-width="${fmt(Math.max(0, element.height))}"${dash} />`
  return { defs: '', body: wrapTransform(element, line) }
}

function renderCurve(element: CurveElement): { defs: string; body: string } {
  const start = element.startPoint
  const control = element.controlPoint
  const end = element.endPoint
  const path = `<path d="M ${fmt(start.x)} ${fmt(start.y)} Q ${fmt(control.x)} ${fmt(control.y)} ${fmt(end.x)} ${fmt(end.y)}" fill="none" stroke="${element.stroke || '#000000'}" stroke-width="${fmt(Math.max(0, element.strokeWidth))}" />`
  return { defs: '', body: wrapTransform(element, path) }
}

function renderEllipse(element: EllipseElement): { defs: string; body: string } {
  const width = element.width
  const height = element.height
  const strokeWidth = Math.max(0, element.strokeWidth)
  const stroke = element.stroke || 'none'
  const ellipse = `<ellipse cx="${fmt(width / 2)}" cy="${fmt(height / 2)}" rx="${fmt(width / 2)}" ry="${fmt(height / 2)}" fill="${element.fill || 'none'}" stroke="${stroke}" stroke-width="${fmt(strokeWidth)}" />`
  return { defs: '', body: wrapTransform(element, ellipse) }
}

function renderImage(element: ImageElement, href: string): { defs: string; body: string } {
  const width = element.width
  const height = element.height
  const radius = element.cornerRadius
  let defs = ''
  let body = ''

  if (!element.src) {
    // 无图片来源时导出占位框
    body += `<rect x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" fill="#f5f5f5" stroke="#c0c4cc" stroke-width="1" stroke-dasharray="4,4" />`
  } else {
    const image = `<image x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" preserveAspectRatio="none" href="${escapeXml(href)}" />`
    if (radius > 0) {
      const clipId = `clip-image-${element.id}`
      defs += roundedClipPath(clipId, width, height, radius)
      body += `<g clip-path="url(#${clipId})">${image}</g>`
    } else {
      body += image
    }
  }

  return { defs, body: wrapTransform(element, body) }
}

function renderQrcode(element: QrcodeElement, href: string): { defs: string; body: string } {
  const width = element.width
  const height = element.width
  const image = `<image x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(href)}" />`
  return { defs: '', body: wrapTransform(element, image) }
}

function renderBarcode(element: BarcodeElement, href: string, canvasWidth: number, canvasHeight: number): { defs: string; body: string } {
  const image = `<image x="0" y="0" width="${fmt(canvasWidth)}" height="${fmt(canvasHeight)}" preserveAspectRatio="none" href="${escapeXml(href)}" />`
  let body = image

  if (element.displayValue && element.content) {
    const textY = element.barcodeHeight + element.margin
    body += `<text x="${fmt(canvasWidth / 2)}" y="${fmt(textY)}" dominant-baseline="text-before-edge" text-anchor="middle" font-size="${fmt(element.fontSize)}" font-family="OCR-B" font-weight="bold" fill="${element.foreground || '#000000'}">${escapeXml(element.content)}</text>`
  }

  return { defs: '', body: wrapTransform(element, body) }
}

async function resolveImageHref(src: string): Promise<string> {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }

  try {
    const response = await fetch(src)
    if (!response.ok) return src
    const blob = await response.blob()
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : src)
      reader.onerror = () => resolve(src)
      reader.readAsDataURL(blob)
    })
  } catch {
    return src
  }
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

export async function buildSvgString(
  elements: IGraphicElement[],
  width: number,
  height: number,
): Promise<string> {
  let defs = ''
  const bodyParts: string[] = []

  for (const element of elements) {
    if (!element.visible) continue

    let result: { defs: string; body: string } | null = null

    switch (element.type) {
      case 'rect':
        result = renderRect(element as RectElement)
        break
      case 'text':
        result = renderText(element as TextElement)
        break
      case 'line':
        result = renderLine(element as LineElement)
        break
      case 'curve':
        result = renderCurve(element as CurveElement)
        break
      case 'ellipse':
        result = renderEllipse(element as EllipseElement)
        break
      case 'image':
        result = renderImage(element as ImageElement, await resolveImageHref((element as ImageElement).src))
        break
      case 'qr': {
        const qrElement = element as QrcodeElement
        const canvas = await qrElement.renderQrcode()
        result = renderQrcode(qrElement, canvasToDataUrl(canvas))
        break
      }
      case 'barcode': {
        const barcodeElement = element as BarcodeElement
        const canvas = await barcodeElement.renderBarcode()
        result = renderBarcode(barcodeElement, canvasToDataUrl(canvas), canvas.width, canvas.height)
        break
      }
      default:
        result = null
    }

    if (!result) continue
    defs += result.defs
    bodyParts.push(result.body)
  }

  const defsMarkup = defs ? `<defs>${defs}</defs>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}">${defsMarkup}${bodyParts.join('')}</svg>`
}

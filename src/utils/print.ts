import { buildSvgString } from '@/plugins/export/svg-export'
import type { BaseGraphicElement } from '@/types/base-graphic-element'
import { createPdfFromSvgPages, DEFAULT_CJK_FONT_FAMILY, type CreatePdfOptions, type PdfSvgPage } from './pdf'
import type { EditorHost } from '@/core'
import { RectElement } from '@/plugins/rect/rect'
import { TextElement } from '@/plugins/text/text'
import { LineElement } from '@/plugins/line/line'
import { CurveElement } from '@/plugins/curve/curve'
import { ImageElement } from '@/plugins/image/image'
import { QrcodeElement } from '@/plugins/qrcode/qrcode'
import { BarcodeElement } from '@/plugins/barcode/barcode'
import { EllipseElement } from '@/plugins/ellipse/ellipse'

/** 打印数据项：以 displayName 作为绑定 key */
export type PrintDataItem = Record<string, string | number | boolean | null | undefined>

/** 打印传输方式：pdf = 浏览器生成 PDF 后发送；svg = 逐条发送 SVG，由打印服务端渲染 PDF */
export type PrintTransport = 'pdf' | 'svg'

interface PrintTemplateJson {
  state?: {
    width?: unknown
    height?: unknown
    dpm?: unknown
    wmm?: unknown
    hmm?: unknown
  }
  elements?: Array<Record<string, unknown>>
}

const elementClasses: Record<string, new (host: EditorHost) => BaseGraphicElement> = {
  rect: RectElement,
  text: TextElement,
  line: LineElement,
  curve: CurveElement,
  image: ImageElement,
  qr: QrcodeElement,
  barcode: BarcodeElement,
  ellipse: EllipseElement,
}

function parseTemplate(json: string): PrintTemplateJson {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch (error) {
    throw new Error(`无效的 vkedit JSON：${error instanceof Error ? error.message : String(error)}`)
  }

  if (!data || typeof data !== 'object' || !Array.isArray((data as PrintTemplateJson).elements)) {
    throw new Error('无效的 vkedit JSON：缺少 elements 数组')
  }
  return data as PrintTemplateJson
}

function formatDataValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/**
 * 将一条打印数据按 displayName 绑定填充到模板 elements 中。
 * 仅处理文本、二维码、条码三种组件。
 */
function fillElementsByDataItem(
  elements: Array<Record<string, unknown>>,
  dataItem: PrintDataItem,
): void {
  for (const element of elements) {
    const displayName = typeof element.displayName === 'string' ? element.displayName : ''
    // 仅“可变性”开启的组件参与打印数据填充
    if (!displayName || element.variable !== true || !(displayName in dataItem)) continue

    const value = formatDataValue(dataItem[displayName])
    if (element.type === 'text') {
      element.text = value
    } else if (element.type === 'qr' || element.type === 'barcode') {
      element.content = value
    }
  }
}

function createElements(
  jsonElements: Array<Record<string, unknown>>,
  host: EditorHost,
): BaseGraphicElement[] {
  const elements: BaseGraphicElement[] = []

  for (const jsonElement of jsonElements) {
    const ElementClass = elementClasses[String(jsonElement.type)]
    if (!ElementClass) continue

    const element = new ElementClass(host)
    element.deserialize(jsonElement)
    elements.push(element)
  }

  return elements
}

export interface PrintServicePayload {
  printer?: string
  copies?: number
  mediaWidth?: number
  mediaHeight?: number
  /** @deprecated SVG 中文字体已固定为 Alibaba PuHuiTi，此字段将被忽略 */
  fontFamily?: string
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/**
 * 将 SVG 中文本的 font-family 替换为指定字体族（当前固定使用 Alibaba PuHuiTi）。
 * 仅保留字体族替换，不会修改 font-weight / font-style，便于 svg2pdf_py 等
 * 服务端转换器按已注册的 Bold / Italic 字体变体渲染。
 */
function injectSvgFontFamily(svg: string, fontFamily: string): string {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return svg
  }

  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    if (doc.querySelector('parsererror')) {
      return svg
    }

    const safeFontFamily = /[\s,]/.test(fontFamily) ? `"${fontFamily}"` : fontFamily
    doc.querySelectorAll('text, tspan').forEach((node) => {
      node.setAttribute('font-family', safeFontFamily)
    })

    return new XMLSerializer().serializeToString(doc.documentElement)
  } catch {
    return svg
  }
}

function buildPrintServiceUrl(printerAddress: string): string {
  const trimmed = printerAddress.trim().replace(/\/+$/, '')
  if (!trimmed) {
    throw new Error('打印机地址不能为空')
  }
  if (/\/api\/print$/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed}/api/print`
}

async function sendBase64ToPrinter(
  base64: string,
  printerAddress: string,
  payload: PrintServicePayload = {},
): Promise<void> {
  const response = await fetch(buildPrintServiceUrl(printerAddress), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdf: base64,
      printer: payload.printer ?? '',
      copies: payload.copies ?? 1,
      mediaWidth: payload.mediaWidth ?? 0,
      mediaHeight: payload.mediaHeight ?? 0,
    }),
  })

  if (!response.ok) {
    throw new Error(`打印机通讯失败：HTTP ${response.status} ${response.statusText}`)
  }
}

async function sendPdfToPrinter(
  blob: Blob,
  printerAddress: string,
  payload: PrintServicePayload = {},
): Promise<void> {
  const pdfBase64 = await blobToBase64(blob)
  await sendBase64ToPrinter(pdfBase64, printerAddress, payload)
}

/**
 * 将 SVG 字符串以 base64 形式发送到打印服务。
 *
 * 与 sendPdfToPrinter 的区别仅在于入参：
 * - sendPdfToPrinter 接收 PDF Blob
 * - sendSvgToPrinter 接收 SVG 字符串
 *
 * 打印接口的 `pdf` 字段统一为 base64 字符串，这里即 SVG 的 base64 编码。
 *
 * @param svg SVG 字符串（由 buildSvgString / 导出 SVG 等生成）
 * @param printerAddress 打印机通讯服务地址
 * @param payload 打印机名称、份数、纸张尺寸等
 */
export async function sendSvgToPrinter(
  svg: string,
  printerAddress: string,
  payload: PrintServicePayload = {},
): Promise<void> {
  // SVG 中文字体固定为 Alibaba PuHuiTi，发送前统一替换非 ASCII 文本的 font-family
  const finalSvg = injectSvgFontFamily(svg, DEFAULT_CJK_FONT_FAMILY)
  const svgBase64 = await blobToBase64(
    new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' }),
  )
  await sendBase64ToPrinter(svgBase64, printerAddress, payload)
}

// 保留所有用于打印的隐藏 iframe，避免在打印对话框仍打开时被提前移除导致“闪退”
const printIframes: HTMLIFrameElement[] = []

function removePrintIframes(): void {
  while (printIframes.length > 0) {
    const iframe = printIframes.pop()
    if (iframe?.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }
}

function printPdfByBrowser(blob: Blob): void {
  // 新一次打印前先清理上一次遗留的隐藏 iframe
  removePrintIframes()

  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  // 不要使用 width:0/height:0 或 display:none：Chrome/Safari 会跳过 PDF 插件渲染，
  // 导致 iframe 加载后调用 print() 没有任何反应。改用屏幕外可见尺寸 + visibility:hidden。
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '1024px'
  iframe.style.height = '768px'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  iframe.setAttribute('aria-hidden', 'true')
  printIframes.push(iframe)

  const cleanup = () => {
    if (!iframe.parentNode) return
    iframe.parentNode.removeChild(iframe)
    URL.revokeObjectURL(url)
    const index = printIframes.indexOf(iframe)
    if (index >= 0) printIframes.splice(index, 1)
  }

  iframe.onload = () => {
    try {
      const contentWindow = iframe.contentWindow
      if (!contentWindow) {
        cleanup()
        return
      }

      // Firefox/Safari 的 PDF 查看器需要一点初始化时间
      setTimeout(() => {
        try {
          contentWindow.focus()
          contentWindow.print()
        } catch (error) {
          console.error('Print failed:', error)
          cleanup()
          return
        }
      }, 300)
    } catch {
      cleanup()
    }
  }

  iframe.onerror = () => cleanup()
  document.body.appendChild(iframe)
  iframe.src = url
}

/**
 * 业务打印函数：将打印数据逐条填充到 vkedit JSON 模板中。
 *
 * 默认每条数据生成一页 PDF；设置 transport 为 'svg' 且传入 printerAddress 时，
 * 会改为逐条把 SVG（base64）发送到打印服务端，由服务端渲染 PDF 后打印，
 * 浏览器侧不再生成 PDF。
 *
 * @param data 打印数据数组，每个数据项以元素 displayName 作为绑定 key
 * @param json vkedit 导出的 JSON 字符串
 * @param printerAddress 打印机通讯服务地址；为空时使用浏览器打印
 * @param pdfOptions PDF 字体等导出选项；pdf 模式用于本地生成 PDF，svg 模式中文字体固定为 Alibaba PuHuiTi，不依赖此参数
 * @param printerName 打印机名称，仅在 printerAddress 非空时发送到打印服务
 * @param transport 打印传输方式：'pdf'（默认）或 'svg'
 * @returns 生成的 PDF Blob；SVG 传输模式不生成本地 PDF，返回 null
 */
export async function printBusinessData(
  data: PrintDataItem[],
  json: string,
  printerAddress?: string,
  pdfOptions?: CreatePdfOptions,
  printerName?: string,
  transport: PrintTransport = 'pdf',
): Promise<Blob | null> {
  if (!Array.isArray(data)) {
    throw new Error('打印数据必须是数组')
  }

  const template = parseTemplate(json)
  const elements = template.elements ?? []
  const state = template.state ?? {}

  const width = Number(state.width) || 400
  const height = Number(state.height) || 400
  const dpm = Number(state.dpm) || 8
  const mediaWidth = Number(state.wmm) || width / dpm
  const mediaHeight = Number(state.hmm) || height / dpm

  // 仅用于构建元素实例的宿主上下文，打印渲染只需 dpm 换算像素
  const printHost = { status: { dpm } } as unknown as EditorHost

  const svgMode = transport === 'svg' && Boolean(printerAddress)
  const pdfPages: PdfSvgPage[] = []

  for (let index = 0; index < data.length; index++) {
    // 深拷贝当前模板 elements，避免数据串页
    const pageJsonElements = elements.map((element) => ({ ...element }))
    fillElementsByDataItem(pageJsonElements, data[index])

    const pageElements = createElements(pageJsonElements, printHost)
    const svg = await buildSvgString(pageElements, width, height)

    if (svgMode && printerAddress) {
      // 逐条发送 SVG，交给打印服务端渲染 PDF 并打印
      await sendSvgToPrinter(svg, printerAddress, {
        printer: printerName,
        copies: 1,
        mediaWidth,
        mediaHeight,
      })
    } else {
      pdfPages.push({ svg, width, height })
    }
  }

  // SVG 模式已在循环中逐条发送，不需要在浏览器生成 PDF
  if (svgMode) {
    return null
  }

  const pdf = await createPdfFromSvgPages(pdfPages, pdfOptions)
  const pdfBlob = pdf.output('blob')

  if (printerAddress) {
    await sendPdfToPrinter(pdfBlob, printerAddress, {
      printer: printerName,
      copies: 1,
      mediaWidth,
      mediaHeight,
    })
  } else {
    printPdfByBrowser(pdfBlob)
  }

  return pdfBlob
}

import jsPDF from 'jspdf'
import 'svg2pdf.js'
import cjkFontUrl from '@/assets/fonts/NotoSansSC-Regular.ttf?no-inline'

export interface PdfSvgPage {
  svg: string
  width: number
  height: number
}

export interface PdfFontInput {
  /** 注册到 jsPDF 的字体名称，也是 SVG font-family 中使用的名称 */
  family: string
  /** 字体文件地址或二进制内容（TTF/OTF） */
  src: string | ArrayBuffer | Uint8Array
  fontStyle?: 'normal' | 'italic' | 'bold'
  fontWeight?: string | number
}

export interface CreatePdfOptions {
  /** 自定义字体注册表；会在导出时自动注册到本次 PDF */
  fonts?: PdfFontInput[]
  /** 用于 SVG 中非 ASCII 文本的字体族；默认使用内置 NotoSansSC */
  cjkFontFamily?: string
  /** 是否启用内置 Noto Sans SC 字体，默认 true */
  enableDefaultCjkFont?: boolean
}

export const DEFAULT_CJK_FONT_FAMILY = 'NotoSansSC'

interface RegisteredFont {
  family: string
  fontStyle: string
  fontWeight: string | number
  base64: string
}

const fontRegistry = new Map<string, RegisteredFont>()
let defaultCjkFontPromise: Promise<void> | null = null

function parseSvgString(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('SVG 解析失败：无法生成 PDF')
  }
  return doc.documentElement as unknown as SVGSVGElement
}

function getFontKey(family: string, fontStyle: string, fontWeight: string | number): string {
  return `${family}|${fontStyle}|${fontWeight}`
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function loadFontBase64(src: string | ArrayBuffer | Uint8Array): Promise<string> {
  if (typeof src === 'string') {
    const response = await fetch(src)
    if (!response.ok) {
      throw new Error(`加载 PDF 字体失败：${response.status} ${response.statusText}`)
    }
    return arrayBufferToBase64(await response.arrayBuffer())
  }

  if (src instanceof ArrayBuffer) {
    return arrayBufferToBase64(src)
  }

  if (ArrayBuffer.isView(src)) {
    const { buffer, byteOffset, byteLength } = src
    return arrayBufferToBase64(buffer.slice(byteOffset, byteOffset + byteLength))
  }

  throw new Error('不支持的字体数据格式')
}

/**
 * 注册一个用于 PDF 矢量导出的字体（TTF/OTF）。
 * 注册后，SVG 文本的 font-family 会匹配该 family，中文等非 ASCII 字符可正常嵌入 PDF。
 */
export async function registerPdfFont(font: PdfFontInput): Promise<string> {
  const fontStyle = font.fontStyle ?? 'normal'
  const fontWeight = font.fontWeight ?? 400
  const key = getFontKey(font.family, fontStyle, fontWeight)

  if (fontRegistry.has(key)) {
    return font.family
  }

  const base64 = await loadFontBase64(font.src)
  fontRegistry.set(key, {
    family: font.family,
    fontStyle,
    fontWeight,
    base64,
  })

  return font.family
}

function ensureDefaultCjkFont(): Promise<void> {
  if (!defaultCjkFontPromise) {
    defaultCjkFontPromise = registerPdfFont({
      family: DEFAULT_CJK_FONT_FAMILY,
      src: cjkFontUrl,
    })
      .then(() => undefined)
      .catch((error) => {
        defaultCjkFontPromise = null
        throw error
      })
  }
  return defaultCjkFontPromise
}

function applyRegisteredFontsToPdf(pdf: jsPDF): void {
  for (const font of fontRegistry.values()) {
    const safeFamily = font.family.replace(/[^a-zA-Z0-9_-]/g, '-')
    const fileName = `vkedit-${safeFamily}-${font.fontStyle}-${String(font.fontWeight)}.ttf`
    pdf.addFileToVFS(fileName, font.base64)
    pdf.addFont(fileName, font.family, font.fontStyle, font.fontWeight, 'Identity-H')
  }
}

function hasRegisteredFontFamily(family: string): boolean {
  for (const font of fontRegistry.values()) {
    if (font.family === family) {
      return true
    }
  }
  return false
}

function normalizeFontWeight(weight: string | number): number {
  if (typeof weight === 'number') {
    return weight
  }
  if (weight === 'normal') {
    return 400
  }
  if (weight === 'bold') {
    return 700
  }
  const numeric = Number(weight)
  return Number.isFinite(numeric) ? numeric : 400
}

function hasRegisteredFontStyle(
  family: string,
  fontStyle: string,
  fontWeight: string | number,
): boolean {
  const targetWeight = normalizeFontWeight(fontWeight)
  for (const font of fontRegistry.values()) {
    if (
      font.family === family &&
      font.fontStyle === fontStyle &&
      normalizeFontWeight(font.fontWeight) === targetWeight
    ) {
      return true
    }
  }
  return false
}

function findRegisteredFontStyle(family: string): RegisteredFont | undefined {
  for (const font of fontRegistry.values()) {
    if (font.family === family) {
      return font
    }
  }
  return undefined
}

/**
 * 检测 SVG 中是否包含非 ASCII 文本（中文、日文、韩文、emoji 等）。
 * 这些字符需要已注册的 CJK 字体才能以矢量方式写入 PDF。
 */
function containsNonAsciiText(svg: string): boolean {
  const svgElement = parseSvgString(svg)
  const textNodes = svgElement.querySelectorAll('text, tspan')
  return Array.from(textNodes).some((node) => /[^\x00-\x7F]/.test(node.textContent || ''))
}

/**
 * 将 SVG 调整为 svg2pdf 可正确还原的形态：
 * 1. svg2pdf 不支持 dominant-baseline="text-before-edge"，会按 alphabetic 基线渲染导致文本上移，
 *    这里统一替换为它支持的 "text-top"。
 * 2. 非 ASCII 文本注入已注册的 CJK 字体，避免中文乱码。
 */
function prepareSvgElementForPdf(svgElement: SVGSVGElement, cjkFontFamily?: string): void {
  const safeFontFamily = cjkFontFamily && /[\s,]/.test(cjkFontFamily) ? `"${cjkFontFamily}"` : cjkFontFamily
  const textNodes = svgElement.querySelectorAll<SVGElement>('text, tspan')

  textNodes.forEach((node) => {
    if (node.getAttribute('dominant-baseline') === 'text-before-edge') {
      // svg2pdf 不读取 dominant-baseline，需要通过 alignment-baseline 传递文本顶部对齐信息
      node.setAttribute('dominant-baseline', 'text-top')
      node.setAttribute('alignment-baseline', 'text-top')
    }

    if (!cjkFontFamily || !/[^\x00-\x7F]/.test(node.textContent || '')) {
      return
    }

    if (safeFontFamily) {
      node.setAttribute('font-family', safeFontFamily)
    }

    const fontStyle = node.getAttribute('font-style') || 'normal'
    const fontWeight = node.getAttribute('font-weight') || 'normal'
    if (!hasRegisteredFontStyle(cjkFontFamily, fontStyle, fontWeight)) {
      const fallback = findRegisteredFontStyle(cjkFontFamily)
      if (fallback) {
        node.setAttribute('font-style', fallback.fontStyle)
        node.setAttribute('font-weight', String(fallback.fontWeight))
      }
    }
  })
}

/**
 * 将单个 SVG 字符串以矢量方式添加到 jsPDF 当前页。
 */
export async function addSvgToPdfPage(
  pdf: jsPDF,
  svg: string,
  width: number,
  height: number,
  cjkFontFamily?: string,
): Promise<jsPDF> {
  const svgElement = parseSvgString(svg)
  prepareSvgElementForPdf(svgElement, cjkFontFamily)
  return pdf.svg(svgElement, { x: 0, y: 0, width, height })
}

/**
 * 将多页 SVG 矢量渲染为 PDF。
 * 页面包含中文等非 ASCII 字符时，会先注入已注册的中文字体，再交给 svg2pdf 矢量直出。
 */
export async function createPdfFromSvgPages(
  pages: PdfSvgPage[],
  options: CreatePdfOptions = {},
): Promise<jsPDF> {
  if (pages.length === 0) {
    throw new Error('没有可导出的 PDF 页面')
  }

  const hasNonAscii = pages.some((page) => containsNonAsciiText(page.svg))
  const enableDefaultCjkFont = options.enableDefaultCjkFont !== false
  const cjkFontFamily =
    options.cjkFontFamily || (enableDefaultCjkFont ? DEFAULT_CJK_FONT_FAMILY : undefined)

  if (hasNonAscii) {
    if (options.fonts && options.fonts.length > 0) {
      await Promise.all(options.fonts.map((font) => registerPdfFont(font)))
    }
    if (enableDefaultCjkFont) {
      await ensureDefaultCjkFont()
    }
    if (!cjkFontFamily || !hasRegisteredFontFamily(cjkFontFamily)) {
      throw new Error(
        '导出中文 PDF 前需要注册中文字体：请调用 registerPdfFont({ family, src }) 或传入 createPdfFromSvgPages 的 fonts 参数',
      )
    }
  }

  const first = pages[0]
  const orientation = first.width >= first.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [first.width, first.height],
    compress: true,
  })

  applyRegisteredFontsToPdf(pdf)

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index]
    if (index > 0) {
      pdf.addPage([page.width, page.height], orientation)
    }

    const svgElement = parseSvgString(page.svg)
    prepareSvgElementForPdf(svgElement, cjkFontFamily)
    await pdf.svg(svgElement, { x: 0, y: 0, width: page.width, height: page.height })
  }

  return pdf
}

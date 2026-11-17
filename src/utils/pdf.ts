import jsPDF from 'jspdf'
import 'svg2pdf.js'
import { DEFAULT_CJK_FONT_FAMILY, DEFAULT_LATIN_FONT_FAMILY } from './fonts'

export { DEFAULT_CJK_FONT_FAMILY, DEFAULT_LATIN_FONT_FAMILY }

/** assets/fonts 目录下所有 TTF 字体文件，打包时保持为独立资源（?no-inline） */
const fontModules = import.meta.glob<string>('../assets/fonts/*.ttf', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})

export interface PdfSvgPage {
  svg: string
  width: number
  height: number
}

export interface PdfFontInput {
  /** 注册到 jsPDF 的字体名称，也是 SVG font-family 中使用的名称 */
  family: string
  /** 字体文件地址或二进制内容（TTF） */
  src: string | ArrayBuffer | Uint8Array
  fontStyle?: 'normal' | 'italic' | 'bold'
  fontWeight?: string | number
}

export interface CreatePdfOptions {
  /** 自定义字体注册表；会在导出时自动注册到本次 PDF */
  fonts?: PdfFontInput[]
  /** 用于 SVG 中非 ASCII 文本的字体族；默认使用 assets/fonts 下的 Alibaba PuHuiTi */
  cjkFontFamily?: string
  /** 用于 SVG 中 ASCII/西文文本的字体族；默认使用 assets/fonts 下的 Alibaba Sans */
  latinFontFamily?: string
  /** 是否启用内置字体（自动注册 assets/fonts 下所有中英文字体），默认 true */
  enableDefaultCjkFont?: boolean
}

/** 常见字重后缀到 font-weight 的映射 */
const FONT_WEIGHT_ALIASES: Record<string, number> = {
  thin: 100,
  hairline: 100,
  light: 300,
  regular: 400,
  regularl3: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  heavy: 900,
  black: 900,
  italic: 400,
  bolditalic: 700,
  oblique: 400,
}

interface ParsedFontFileName {
  family: string
  fontStyle: 'normal' | 'italic'
  fontWeight: number
}

/** 从字体文件名推断 font-family / font-style / font-weight */
function parseFontFileName(fileName: string): ParsedFontFileName {
  const base = fileName.replace(/\.(ttf)$/i, '')
  const lower = base.toLowerCase()
  const weightKeys = Object.keys(FONT_WEIGHT_ALIASES).sort((a, b) => b.length - a.length)

  let fontStyle: 'normal' | 'italic' = 'normal'
  let fontWeight = 400

  for (const key of weightKeys) {
    if (lower.endsWith(`-${key}`)) {
      fontWeight = FONT_WEIGHT_ALIASES[key]
      if (/italic|oblique/.test(key)) {
        fontStyle = 'italic'
      }
      break
    }
  }

  let family = base
  for (const key of weightKeys) {
    family = family.replace(new RegExp(`-${key}$`, 'i'), '')
  }
  family = family.replace(/-\d+/g, '')
  // 与 TextElement / 内置字体常量保持一致：字体族使用带空格的名称
  if (family === 'AlibabaPuHuiTi') {
    family = DEFAULT_CJK_FONT_FAMILY
  } else if (family === 'AlibabaSans') {
    family = DEFAULT_LATIN_FONT_FAMILY
  }

  return {
    family: family || base,
    fontStyle,
    fontWeight,
  }
}

interface RegisteredFont {
  family: string
  fontStyle: string
  fontWeight: string | number
  base64: string
}

const fontRegistry = new Map<string, RegisteredFont>()
let defaultFontsPromise: Promise<void> | null = null

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
 * 注册一个用于 PDF 矢量导出的字体（TTF）。
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

function ensureDefaultFonts(): Promise<void> {
  if (!defaultFontsPromise) {
    defaultFontsPromise = (async () => {
      // 自动注册 assets/fonts 目录下的所有内置字体（Alibaba PuHuiTi + Alibaba Sans），
      // 并根据文件名推断 family / style / weight
      for (const [path, url] of Object.entries(fontModules)) {
        const fileName = path.split('/').pop() ?? path
        const { family, fontStyle, fontWeight } = parseFontFileName(fileName)
        await registerPdfFont({
          family,
          src: url,
          fontStyle,
          fontWeight,
        })
      }
    })()
      .then(() => undefined)
      .catch((error) => {
        defaultFontsPromise = null
        throw error
      })
  }
  return defaultFontsPromise
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

/** 判断 SVG 中是否存在非 ASCII（中文等）文本节点 */
function containsNonAsciiText(svg: string): boolean {
  const svgElement = parseSvgString(svg)
  const textNodes = svgElement.querySelectorAll('text, tspan')
  return Array.from(textNodes).some((node) => /[^\x00-\x7F]/.test(node.textContent || ''))
}

/** 判断 SVG 中是否存在纯 ASCII（西文）文本节点 */
function containsPureAsciiText(svg: string): boolean {
  const svgElement = parseSvgString(svg)
  const textNodes = svgElement.querySelectorAll('text, tspan')
  return Array.from(textNodes).some((node) => {
    const text = node.textContent || ''
    return text.length > 0 && /^[\x00-\x7F]*$/.test(text)
  })
}

/**
 * 将 SVG 调整为 svg2pdf 可正确还原的形态：
 * 文本基线由 SVG 导出统一使用 alphabetic（浏览器 SVG、PDF、打印接口共用同一套语义），
 * 这里不再做 PDF 专属的 baseline 转换，避免文本上下偏移。
 * 仅为文本注入已注册的内置字体：中文使用 Alibaba PuHuiTi，西文使用 Alibaba Sans，避免乱码或字体缺失。
 */
function prepareSvgElementForPdf(
  svgElement: SVGSVGElement,
  cjkFontFamily?: string,
  latinFontFamily?: string,
): void {
  const textNodes = svgElement.querySelectorAll<SVGElement>('text, tspan')

  textNodes.forEach((node) => {
    const text = node.textContent || ''
    const isNonAscii = /[^\x00-\x7F]/.test(text)
    const fontFamily = isNonAscii ? cjkFontFamily : latinFontFamily || cjkFontFamily
    if (!fontFamily) {
      return
    }

    const safeFontFamily = /[\s,]/.test(fontFamily) ? `"${fontFamily}"` : fontFamily
    node.setAttribute('font-family', safeFontFamily)

    const fontStyle = node.getAttribute('font-style') || 'normal'
    const fontWeight = node.getAttribute('font-weight') || 'normal'
    if (!hasRegisteredFontStyle(fontFamily, fontStyle, fontWeight)) {
      const fallback = findRegisteredFontStyle(fontFamily)
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
  latinFontFamily?: string,
): Promise<jsPDF> {
  const svgElement = parseSvgString(svg)
  prepareSvgElementForPdf(svgElement, cjkFontFamily, latinFontFamily)
  return pdf.svg(svgElement, { x: 0, y: 0, width, height })
}

/**
 * 将多页 SVG 矢量渲染为 PDF。
 * 页面会先注入已注册的内置字体（Alibaba PuHuiTi / Alibaba Sans），再交给 svg2pdf 矢量直出。
 */
export async function createPdfFromSvgPages(
  pages: PdfSvgPage[],
  options: CreatePdfOptions = {},
): Promise<jsPDF> {
  if (pages.length === 0) {
    throw new Error('没有可导出的 PDF 页面')
  }
  const enableDefaultCjkFont = options.enableDefaultCjkFont !== false
  const cjkFontFamily =
    options.cjkFontFamily || (enableDefaultCjkFont ? DEFAULT_CJK_FONT_FAMILY : undefined)
  const latinFontFamily =
    options.latinFontFamily || (enableDefaultCjkFont ? DEFAULT_LATIN_FONT_FAMILY : undefined)
  const hasNonAscii = pages.some((page) => containsNonAsciiText(page.svg))
  const hasLatinText = pages.some((page) => containsPureAsciiText(page.svg))

  if (options.fonts && options.fonts.length > 0) {
    await Promise.all(options.fonts.map((font) => registerPdfFont(font)))
  }
  if (enableDefaultCjkFont && (hasNonAscii || hasLatinText)) {
    await ensureDefaultFonts()
  }
  if (hasNonAscii && (!cjkFontFamily || !hasRegisteredFontFamily(cjkFontFamily))) {
    throw new Error(
      '导出中文 PDF 前需要注册中文字体：请调用 registerPdfFont({ family, src }) 或传入 createPdfFromSvgPages 的 fonts 参数',
    )
  }
  if (hasLatinText && latinFontFamily && !hasRegisteredFontFamily(latinFontFamily)) {
    throw new Error(
      '导出西文 PDF 前需要注册西文字体：请调用 registerPdfFont({ family, src }) 或传入 createPdfFromSvgPages 的 fonts/latinFontFamily 参数',
    )
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
    prepareSvgElementForPdf(svgElement, cjkFontFamily, latinFontFamily)
    await pdf.svg(svgElement, { x: 0, y: 0, width: page.width, height: page.height })
  }

  return pdf
}

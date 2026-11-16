/**
 * 通过 ?no-inline 保持字体文件为独立资源，避免库构建时将字体内联成 base64。
 * 返回值为 Vite 处理后的字体文件 URL。
 */
const fontUrlModules = import.meta.glob<string>('../assets/fonts/*.ttf', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})

/** 内置中文字体族 */
export const DEFAULT_CJK_FONT_FAMILY = 'Alibaba PuHuiTi'

/** 内置西文字体族 */
export const DEFAULT_LATIN_FONT_FAMILY = 'Alibaba Sans'

/**
 * 文本组件固定字体栈：西文优先使用 Alibaba Sans，中文回退使用 Alibaba PuHuiTi。
 * 该字体栈不可由用户在属性面板修改。
 */
export const DEFAULT_TEXT_FONT_FAMILY = '"Alibaba Sans", "Alibaba PuHuiTi"'

interface FontFaceConfig {
  file: string
  family: string
  weight: number
  style: 'normal' | 'italic'
}

const fontFaceConfigs: FontFaceConfig[] = [
  {
    file: 'AlibabaPuHuiTi-3-55-Regular.ttf',
    family: DEFAULT_CJK_FONT_FAMILY,
    weight: 400,
    style: 'normal',
  },
  {
    file: 'AlibabaPuHuiTi-3-85-Bold.ttf',
    family: DEFAULT_CJK_FONT_FAMILY,
    weight: 700,
    style: 'normal',
  },
  {
    file: 'AlibabaSans-Regular.ttf',
    family: DEFAULT_LATIN_FONT_FAMILY,
    weight: 400,
    style: 'normal',
  },
  {
    file: 'AlibabaSans-Italic.ttf',
    family: DEFAULT_LATIN_FONT_FAMILY,
    weight: 400,
    style: 'italic',
  },
  {
    file: 'AlibabaSans-Bold.ttf',
    family: DEFAULT_LATIN_FONT_FAMILY,
    weight: 700,
    style: 'normal',
  },
  {
    file: 'AlibabaSans-BoldItalic.ttf',
    family: DEFAULT_LATIN_FONT_FAMILY,
    weight: 700,
    style: 'italic',
  },
]

const fontFaceCss = fontFaceConfigs
  .map(({ file, family, weight, style }) => {
    const url = fontUrlModules[`../assets/fonts/${file}`] ?? ''
    if (!url) return ''

    return [
      '@font-face {',
      `  font-family: '${family}';`,
      `  src: url("${url}") format('opentype');`,
      `  font-weight: ${weight};`,
      `  font-style: ${style};`,
      '  font-display: swap;',
      '}',
    ].join('\n')
  })
  .filter(Boolean)
  .join('\n')

let fontStyleInjected = false

/**
 * 注入内置字体（Alibaba PuHuiTi + Alibaba Sans）的 @font-face 样式。
 *
 * 字体文件随 vkedit 一起发布（独立资源文件），浏览器无需在系统中安装该字体，
 * 即可在画布（Konva）与编辑器界面中显示：
 * - 中文使用 Alibaba PuHuiTi
 * - 西文使用 Alibaba Sans
 *
 * 该函数幂等，可在应用入口或编辑器挂载时重复调用。
 */
export function ensureBuiltinFonts(): void {
  if (fontStyleInjected || typeof document === 'undefined' || !document.head || !fontFaceCss) return

  fontStyleInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-vkedit-font', 'alibaba-builtin-fonts')
  style.textContent = fontFaceCss
  document.head.appendChild(style)
}

/**
 * @deprecated 请使用 ensureBuiltinFonts。
 */
export const ensureAlibabaPuHuiTiFont = ensureBuiltinFonts

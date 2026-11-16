/**
 * 通过 ?no-inline 保持字体文件为独立资源，避免库构建时将 8MB+ 的 TTF 内联成 base64。
 * 返回值为 Vite 处理后的字体文件 URL。
 */
const fontUrlModules = import.meta.glob<string>('../assets/fonts/*.ttf', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})

const regularFontUrl = fontUrlModules['../assets/fonts/AlibabaPuHuiTi-3-55-Regular.ttf'] ?? ''
const boldFontUrl = fontUrlModules['../assets/fonts/AlibabaPuHuiTi-3-85-Bold.ttf'] ?? ''

let fontStyleInjected = false

/**
 * 注入 Alibaba PuHuiTi 的 @font-face 样式。
 *
 * 字体文件随 vkedit 一起发布（独立资源文件），浏览器无需在系统中安装该字体，
 * 即可在画布（Konva）与编辑器界面中显示 Alibaba PuHuiTi。
 * 该函数幂等，可在应用入口或编辑器挂载时重复调用。
 */
export function ensureAlibabaPuHuiTiFont(): void {
  if (fontStyleInjected || typeof document === 'undefined' || !document.head) return

  fontStyleInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-vkedit-font', 'alibaba-puhuiti')
  style.textContent = [
    '@font-face {',
    "  font-family: 'Alibaba PuHuiTi';",
    `  src: url("${regularFontUrl}") format('truetype');`,
    '  font-weight: 400;',
    '  font-style: normal;',
    '  font-display: swap;',
    '}',
    '@font-face {',
    "  font-family: 'Alibaba PuHuiTi';",
    `  src: url("${boldFontUrl}") format('truetype');`,
    '  font-weight: 700;',
    '  font-style: normal;',
    '  font-display: swap;',
    '}',
  ].join('\n')
  document.head.appendChild(style)
}

import { BaseGraphicElement, type BaseGraphicElementOptions } from '@/types/base-graphic-element'
import { GraphicPlugin } from '@/types/graphic-plugin'
import type { IFontStyle } from '@/types'
import PropertyPanel from './PropertyPanel.vue'
import Shape from './Shape.vue'
import IconTextFields from '~icons/ph/text-aa-light'
import { DEFAULT_TEXT_FONT_FAMILY } from '@/utils/fonts'
import TextContextMenu from './TextContextMenu.vue'
import type { EditorHost } from '@/core'

export interface TextOptions extends BaseGraphicElementOptions {
  x?: number
  y?: number
  text?: string
  fontSize?: number
  letterSpacingMM?: number
  /** @deprecated 字体已固定为 Alibaba Sans + Alibaba PuHuiTi，传入会被忽略 */
  fontFamily?: string
  align?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  fontStyle?: 'normal' | 'italic' | 'bold' | '500' | 'italic bold'
  fill?: string
  variable?: boolean
  xmm?: number
  ymm?: number
}

export class TextElement extends BaseGraphicElement {
  public type = 'text'
  private _text: string = '新建文本'
  public fontSize: number = 20
  public letterSpacingMM: number = 0
  private _fontFamily: string = DEFAULT_TEXT_FONT_FAMILY
  public align: 'left' | 'center' | 'right' | 'justify' = 'left'
  public verticalAlign: 'top' | 'middle' | 'bottom' = 'bottom'
  private _fontStyle: IFontStyle = 'normal'
  public fill: string = '#000000'
  public variable: boolean = false

  public get text(): string {
    return this._text
  }

  public set text(value: string) {
    this._text = value
    this.normalizeFontStyleForCjk()
  }

  public get fontFamily(): string {
    return this._fontFamily
  }

  public set fontFamily(_value: string) {
    // 字体固定为 Alibaba Sans + Alibaba PuHuiTi，不可修改
    this._fontFamily = DEFAULT_TEXT_FONT_FAMILY
  }

  public get fontStyle(): IFontStyle {
    return this._fontStyle
  }

  public set fontStyle(value: IFontStyle) {
    const raw = String(value ?? 'normal').toLowerCase()
    if (raw === '500') {
      this._fontStyle = '500'
    } else {
      const hasBold = raw.includes('bold')
      const hasItalic = raw.includes('italic')
      this._fontStyle = hasBold && hasItalic ? 'italic bold' : hasBold ? 'bold' : hasItalic ? 'italic' : 'normal'
    }
    this.normalizeFontStyleForCjk()
  }

  private hasCjkText(): boolean {
    return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(this._text)
  }

  private normalizeFontStyleForCjk(): void {
    // 中文不允许使用斜体样式；若当前为 italic，自动降为 normal/bold
    if (this.hasCjkText() && this._fontStyle.includes('italic')) {
      this._fontStyle = this._fontStyle.includes('bold') ? 'bold' : 'normal'
    }
  }

  constructor(host:EditorHost,options: Partial<TextOptions> = {}) {
    super(host,{
      xmm: options.xmm ?? 5,
      ymm: options.ymm ?? 5,
      wmm: options.wmm ?? 20,
      hmm: options.hmm ?? 3,
      rotation: options.rotation,
      scaleX: options.scaleX,
      scaleY: options.scaleY,
      visible: options.visible,
      locked: options.locked,
      draggable: options.draggable,
      resizable: options.resizable,
      displayName: options.displayName,
    })
    this.text = options.text ?? this.text
    this.fontSize = options.fontSize ?? this.fontSize
    this.letterSpacingMM = options.letterSpacingMM ?? this.letterSpacingMM
    this.fontFamily = options.fontFamily ?? this.fontFamily
    this.align = options.align ?? this.align
    this.verticalAlign = options.verticalAlign ?? this.verticalAlign
    this.fontStyle = options.fontStyle ?? this.fontStyle
    this.fill = options.fill ?? this.fill
    this.variable = options.variable ?? this.variable
  }

  public get letterSpacing() {
    return Math.round(this.letterSpacingMM * this.host.status.dpm)
  }

  public get config() {
    return {
      ...super.config,
      text: this.text,
      fontSize: this.fontSize,
      letterSpacing: this.letterSpacing,
      fontFamily: this.fontFamily,
      align: this.align,
      verticalAlign: this.verticalAlign,
      fontStyle: this.fontStyle,
      fill: this.fill,
      variable: this.variable,
    }
  }

  deserialize(data: Record<string, unknown>): void {
    super.deserialize(data)
    this.text = typeof data.text === 'string' ? data.text : '新建文本'
    this.fontSize = typeof data.fontSize === 'number' ? data.fontSize : 20
    this.letterSpacingMM = typeof data.letterSpacingMM === 'number' ? data.letterSpacingMM : 0
    // 字体固定为 Alibaba Sans + Alibaba PuHuiTi，忽略旧 JSON 中的 fontFamily
    this.fontFamily = DEFAULT_TEXT_FONT_FAMILY
    this.align = ['left', 'center', 'right', 'justify'].includes(String(data.align))
      ? (data.align as TextElement['align'])
      : 'left'
    this.verticalAlign = ['top', 'middle', 'bottom'].includes(String(data.verticalAlign))
      ? (data.verticalAlign as TextElement['verticalAlign'])
      : 'bottom'
    // 兼容旧 JSON 中的 "normal bold" / "bold italic" 等非标准组合写法
    const rawFontStyle = String(data.fontStyle ?? '').toLowerCase()
    if (rawFontStyle === '500') {
      this.fontStyle = '500'
    } else {
      const hasBold = rawFontStyle.includes('bold')
      const hasItalic = rawFontStyle.includes('italic')
      this.fontStyle = hasBold && hasItalic ? 'italic bold' : hasBold ? 'bold' : hasItalic ? 'italic' : 'normal'
    }
    this.fill = typeof data.fill === 'string' ? data.fill : '#000000'
    this.variable = typeof data.variable === 'boolean' ? data.variable : false
  }

  serialize() {
    return {
      ...super.serialize(),
      text: this.text,
      fontSize: this.fontSize,
      letterSpacingMM: this.letterSpacingMM,
      fontFamily: this.fontFamily,
      align: this.align,
      verticalAlign: this.verticalAlign,
      fontStyle: this.fontStyle,
      fill: this.fill,
      variable: this.variable,
    }
  }
}

export class TextPlugin extends GraphicPlugin<TextElement> {
  public name = 'text-plugin'
  public version = '1.0.0'
  public graphicType = 'text'
  public graphicElement = TextElement
  public shapeComponent = Shape
  public iconComponent = IconTextFields
  public typeDisplayName = '文本'
  public propertyPanel = PropertyPanel

  protected onInstall(): void {
    this.host.emit('context-menu:registered', {
      graphicTypes: ['text'],
      render: () => TextContextMenu,
      isPublic: false,
      isCanvas: false,
      source: 'text-plugin-on-install',
      timestamp: Date.now(),
    })
  }

  protected onUninstall(): void {
    this.host?.emit('context-menu:unregistered', {
      graphicTypes: ['text'],
      render: () => TextContextMenu,
      isPublic: false,
      isCanvas: false,
      source: 'text-plugin-on-install',
      timestamp: Date.now(),
    })
  }
}

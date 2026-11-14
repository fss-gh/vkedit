import { BaseGraphicElement, type BaseGraphicElementOptions } from '@/types/base-graphic-element'
import { GraphicPlugin } from '@/types/graphic-plugin'
import PropertyPanel from './PropertyPanel.vue'
import Shape from './Shape.vue'
import IconTextFields from '~icons/ph/text-aa-light'
import TextContextMenu from './TextContextMenu.vue'
import type { EditorHost } from '@/core'

export interface TextOptions extends BaseGraphicElementOptions {
  x?: number
  y?: number
  text?: string
  fontSize?: number
  fontFamily?: string
  align?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  fontStyle?: 'normal' | 'italic' | 'bold' | '500' | 'italic bold'
  fill?: string
  xmm?: number
  ymm?: number
}

export class TextElement extends BaseGraphicElement {
  public type = 'text'
  public text: string = '新建文本'
  public fontSize: number = 20
  public fontFamily: string = 'Arial'
  public align: 'left' | 'center' | 'right' | 'justify' = 'left'
  public verticalAlign: 'top' | 'middle' | 'bottom' = 'bottom'
  public fontStyle: 'normal' | 'italic' | 'bold' | '500' | 'italic bold' = 'normal'
  public fill: string = '#000000'

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
    this.fontFamily = options.fontFamily ?? this.fontFamily
    this.align = options.align ?? this.align
    this.verticalAlign = options.verticalAlign ?? this.verticalAlign
    this.fontStyle = options.fontStyle ?? this.fontStyle
    this.fill = options.fill ?? this.fill
  }

  public get config() {
    return {
      ...super.config,
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      align: this.align,
      verticalAlign: this.verticalAlign,
      fontStyle: this.fontStyle,
      fill: this.fill,
    }
  }

  deserialize(data: Record<string, unknown>): void {
    super.deserialize(data)
    this.text = typeof data.text === 'string' ? data.text : '新建文本'
    this.fontSize = typeof data.fontSize === 'number' ? data.fontSize : 20
    this.fontFamily = typeof data.fontFamily === 'string' ? data.fontFamily : 'Arial'
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
  }

  serialize() {
    return {
      ...super.serialize(),
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      align: this.align,
      verticalAlign: this.verticalAlign,
      fontStyle: this.fontStyle,
      fill: this.fill,
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

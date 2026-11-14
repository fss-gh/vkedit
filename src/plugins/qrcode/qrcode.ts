import { GraphicPlugin } from '@/types/graphic-plugin'
import { BaseGraphicElement, CORNER_ANCHORS, type BaseGraphicElementOptions } from '@/types/base-graphic-element'
import PropertyPanel from './PropertyPanel.vue'
import Shape from './Shape.vue'
import IconQrCode2 from '~icons/ph/qr-code-light'
import type { EditorHost } from '@/core'
import QRCode from 'qrcode'

export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrcodeOptions extends BaseGraphicElementOptions {
  x?: number
  y?: number
  content?: string
  foreground?: string
  background?: string
  marginMM?: number
  errorCorrectionLevel?: QRErrorCorrectionLevel
  iconSrc?: string
}

export class QrcodeElement extends BaseGraphicElement {
  public type = 'qr'
  public content: string = 'https://example.com'
  public foreground: string = '#000000'
  public background: string = '#ffffff'
  public marginMM: number = 0.2
  public errorCorrectionLevel: QRErrorCorrectionLevel = 'M'
  public iconSrc: string = ''
  // public image = useImage('')[0]

  constructor(host: EditorHost, options: Partial<QrcodeOptions> = {}) {
    super(host, {
      xmm: options.xmm ?? 5,
      ymm: options.ymm ?? 5,
      wmm: options.wmm ?? 20,
      hmm: options.hmm ?? 20,
      rotation: options.rotation,
      scaleX: options.scaleX,
      scaleY: options.scaleY,
      visible: options.visible,
      locked: options.locked,
      draggable: options.draggable,
      resizable: options.resizable,
      displayName: options.displayName,
    })
    this.content = options.content ?? this.content
    this.foreground = options.foreground ?? this.foreground
    this.background = options.background ?? this.background
    this.marginMM = options.marginMM ?? this.marginMM
    this.errorCorrectionLevel = options.errorCorrectionLevel ?? this.errorCorrectionLevel
    this.iconSrc = options.iconSrc ?? this.iconSrc
    this.resizeAnchors = CORNER_ANCHORS
  }

  deserialize(data: Record<string, unknown>): void {
    super.deserialize(data)
    this.content = typeof data.content === 'string' ? data.content : 'https://example.com'
    this.foreground = typeof data.foreground === 'string' ? data.foreground : '#000000'
    this.background = typeof data.background === 'string' ? data.background : '#ffffff'
    this.marginMM = typeof data.marginMM === 'number' ? data.marginMM : 0.2
    this.errorCorrectionLevel = ['L', 'M', 'Q', 'H'].includes(String(data.errorCorrectionLevel))
      ? (data.errorCorrectionLevel as QRErrorCorrectionLevel)
      : 'M'
    this.iconSrc = typeof data.iconSrc === 'string' ? data.iconSrc : ''
  }

  serialize() {
    return {
      ...super.serialize(),
      content: this.content,
      foreground: this.foreground,
      background: this.background,
      marginMM: this.marginMM,
      errorCorrectionLevel: this.errorCorrectionLevel,
      iconSrc: this.iconSrc,
    }
  }

  override get config(): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
    id: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    scaleX: number
    scaleY: number
    visible: boolean
    draggable: boolean
  } {
    const baseConfig = super.config
    baseConfig.height = baseConfig.width
    return baseConfig
  }

  get margin() {
    return Math.round(this.marginMM * this.host.status.dpm)
  }

  async renderQrcode(): Promise<HTMLCanvasElement> {
    const sizePx = Math.max(1, Math.round(this.width))
    const opts = {
      color: {
        dark: this.foreground ?? '#000',
        light: this.background ?? '#fff',
      },
      width: sizePx,
      margin: this.margin,
      errorCorrectionLevel: this.errorCorrectionLevel,
    }
    const canvas = await QRCode.toCanvas(this.content ?? '', opts)
    if (this.iconSrc) {
      await this.drawIcon(canvas, sizePx)
    }
    return canvas
  }

  private loadIconImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load QR icon image'))
      img.src = src
    })
  }

  private async drawIcon(canvas: HTMLCanvasElement, sizePx: number): Promise<void> {
    try {
      const icon = await this.loadIconImage(this.iconSrc)
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 图标约占二维码尺寸的 22%，保持视觉平衡
      const iconBox = Math.max(8, Math.round(sizePx * 0.22))
      const scale = Math.min(iconBox / (icon.width || 1), iconBox / (icon.height || 1))
      const iconWidth = Math.max(1, Math.round(icon.width * scale))
      const iconHeight = Math.max(1, Math.round(icon.height * scale))
      const iconX = Math.round((sizePx - iconWidth) / 2)
      const iconY = Math.round((sizePx - iconHeight) / 2)

      // 图标底部绘制白色/背景色圆角垫片，避免遮挡码眼导致扫码失败
      const padding = Math.max(2, Math.round(iconBox * 0.08))
      const padX = iconX - padding
      const padY = iconY - padding
      const padWidth = iconWidth + padding * 2
      const padHeight = iconHeight + padding * 2

      ctx.fillStyle = this.background || '#ffffff'
      ctx.beginPath()
      const radius = Math.min(padding * 1.2, padWidth / 2, padHeight / 2)
      ctx.moveTo(padX + radius, padY)
      ctx.arcTo(padX + padWidth, padY, padX + padWidth, padY + padHeight, radius)
      ctx.arcTo(padX + padWidth, padY + padHeight, padX, padY + padHeight, radius)
      ctx.arcTo(padX, padY + padHeight, padX, padY, radius)
      ctx.arcTo(padX, padY, padX + padWidth, padY, radius)
      ctx.closePath()
      ctx.fill()

      ctx.drawImage(icon, iconX, iconY, iconWidth, iconHeight)
    } catch {
      // 图标加载失败时忽略，仅导出纯二维码
    }
  }

  override getBoundingBox(): { x: number; y: number; width: number; height: number } {
    // 二位始终为正方形
    return { ...super.getBoundingBox(), height: this.width }
  }
}

export class QrcodePlugin extends GraphicPlugin<QrcodeElement> {
  public name = 'qr-plugin'
  public version = '1.0.0'
  public graphicType = 'qr'
  public graphicElement = QrcodeElement
  public shapeComponent = Shape
  public iconComponent = IconQrCode2
  public typeDisplayName = '二维码'
  public propertyPanel = PropertyPanel
}

import Shape from './Shape.vue'
import PropertyPanel from './PropertyPanel.vue'
import IconEllipse from '~icons/ph/circle-light'
import { BaseGraphicElement, type BaseGraphicElementOptions } from '@/types/base-graphic-element'
import type { EditorHost } from '@/core'
import { GraphicPlugin } from '@/types/graphic-plugin'

export interface EllipseOptions extends BaseGraphicElementOptions {
  x?: number
  y?: number
  fill?: string
  stroke?: string
  strokeWidthMM?: number
  xmm?: number
  ymm?: number
}

// 圆形元素实现：宽高相等时即为圆，否则为椭圆
export class EllipseElement extends BaseGraphicElement {
  public type = 'ellipse'
  public fill: string = ''
  public stroke: string = 'black'
  public strokeWidthMM: number = 0.2

  constructor(host: EditorHost, options: Partial<EllipseOptions> = {}) {
    // 支持传入 xmm/ymm 或 x/y
    super(host, {
      xmm: options.xmm ?? options.x ?? 5,
      ymm: options.ymm ?? options.y ?? 5,
      wmm: options.wmm ?? 30,
      hmm: options.hmm ?? 30,
      rotation: options.rotation,
      scaleX: options.scaleX,
      scaleY: options.scaleY,
      visible: options.visible,
      locked: options.locked,
      draggable: options.draggable,
      resizable: options.resizable,
    })
    this.fill = options.fill ?? this.fill
    this.stroke = options.stroke ?? this.stroke
    this.strokeWidthMM = options.strokeWidthMM ?? this.strokeWidthMM
  }

  public get strokeWidth() {
    return Math.round(this.strokeWidthMM * this.host.status.dpm)
  }

  // group 使用左上角定位；内部 Ellipse 以 group 原点为中心
  public get groupConfig() {
    return {
      ...super.config,
    }
  }

  public get ellipseConfig() {
    return {
      x: this.width / 2,
      y: this.height / 2,
      radiusX: this.width / 2,
      radiusY: this.height / 2,
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
    }
  }

  deserialize(data: Record<string, unknown>): void {
    super.deserialize(data)
    this.fill = typeof data.fill === 'string' ? data.fill : ''
    this.stroke = typeof data.stroke === 'string' ? data.stroke : 'black'
    this.strokeWidthMM = typeof data.strokeWidthMM === 'number' ? data.strokeWidthMM : 0.2
  }

  serialize() {
    return {
      ...super.serialize(),
      fill: this.fill,
      stroke: this.stroke,
      strokeWidthMM: this.strokeWidthMM,
    }
  }
}

export class EllipsePlugin extends GraphicPlugin<EllipseElement> {
  public name = 'ellipse-plugin'
  public version = '1.0.0'
  public graphicType = 'ellipse'
  public graphicElement = EllipseElement
  public shapeComponent = Shape
  public iconComponent = IconEllipse
  public typeDisplayName = '圆形'
  public propertyPanel = PropertyPanel
}

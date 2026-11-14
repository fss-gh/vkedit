import { GraphicPlugin } from '@/types/graphic-plugin'
import Shape from './Shape.vue'
import PropertyPanel from './PropertyPanel.vue'
import IconPenSize1 from '~icons/ph/pen-nib-light'
import { BaseGraphicElement, type BaseGraphicElementOptions } from '@/types/base-graphic-element'
import type { EditorHost } from '@/core'

export interface LineOptions extends BaseGraphicElementOptions {
  stroke?: string
  lineType?: 'solid' | 'dashed'
  xmm?: number
  ymm?: number
}

// 直线元素实现：用 v-line 绘制可见线条（支持实线/虚线），配合透明命中层保证细线在任意缩放下可选中
export class LineElement extends BaseGraphicElement {
  public type = 'line'
  public stroke: string = 'black'
  public lineType: 'solid' | 'dashed' = 'solid'
  // 把 width 当做线长，height 当做线宽（粗细）

  // 屏幕空间最小命中厚度（像素），与 zoom 无关
  private static readonly MIN_HIT_SCREEN_PX = 10

  constructor(host: EditorHost, options: Partial<LineOptions> = {}) {
    // 支持传入 xmm/ymm 或 x/y
    super(host, {
      xmm: options.xmm ?? 5,
      ymm: options.ymm ?? 5,
      wmm: options.wmm ?? 10,
      hmm: options.hmm ?? 0.2,
      rotation: options.rotation,
      scaleX: options.scaleX,
      scaleY: options.scaleY,
      visible: options.visible,
      locked: options.locked,
      draggable: options.draggable,
      resizable: options.resizable,
    })
    this.stroke = options.stroke ?? this.stroke
    this.lineType = options.lineType ?? this.lineType
  }

  // 命中矩形高度（内容空间像素）：保证屏幕上可点击厚度不低于 MIN_HIT_SCREEN_PX
  // 公式：hitHeight = max(height, MIN_HIT_SCREEN_PX / (abs(scaleY) * zoom))
  public get hitHeight(): number {
    const zoom = Math.max(this.host.status.zoom, 0.001)
    const absScaleY = Math.abs(this.scaleY)
    if (absScaleY < 0.001) {
      return this.height
    }
    const expanded = LineElement.MIN_HIT_SCREEN_PX / (absScaleY * zoom)
    return Math.max(this.height, expanded)
  }

  // v-group 配置：继承 super.config，id 放在 group 上供 selection.findOne('#id') 命中
  public get groupConfig() {
    return {
      ...super.config,
    }
  }


  // 可见线条：使用 v-line 绘制，strokeWidth 对应线宽，支持实线/虚线
  public get visibleLineConfig() {
    return {
      points: [0, this.height / 2, this.width, this.height / 2],
      stroke: this.stroke,
      strokeWidth: this.height,
      lineCap: 'butt' as const,
      dash: this.lineType === 'dashed' ? [4, 2] : undefined,
    }
  }

  // 透明命中矩形：仅厚度方向扩展，居中对齐可见矩形
  public get hitRectConfig() {
    const hitHeight = this.hitHeight
    return {
      width: this.width,
      height: hitHeight,
      x: 0,
      y: -(hitHeight - this.height) / 2,
      fill: 'transparent',
    }
  }

  deserialize(data: Record<string, unknown>): void {
    super.deserialize(data)
    this.stroke = (data.stroke as string) ?? this.stroke
    this.lineType = (data.lineType as string) === 'dashed' ? 'dashed' : 'solid'
  }

  serialize() {
    return {
      ...super.serialize(),
      stroke: this.stroke,
      lineType: this.lineType,
    }
  }
}

export class LinePlugin extends GraphicPlugin<LineElement> {
  public name = 'line-plugin'
  public version = '1.0.0'
  public graphicType = 'line'
  public graphicElement = LineElement
  public shapeComponent = Shape
  public iconComponent = IconPenSize1
  public typeDisplayName = '直线'
  public propertyPanel = PropertyPanel
}

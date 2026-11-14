import { GraphicPlugin } from '@/types/graphic-plugin'
import { BaseGraphicElement, type BaseGraphicElementOptions } from '@/types/base-graphic-element'
import PropertyPanel from './PropertyPanel.vue'
import Shape from './Shape.vue'
import IconBezierCurve from '~icons/ph/bezier-curve-light'
import type { EditorHost } from '@/core'
import konva from 'konva'

export interface CurvePoint {
  /** 相对元素宽度（0~1） */
  x: number
  /** 相对元素高度（0~1） */
  y: number
}

export interface CurveOptions extends BaseGraphicElementOptions {
  stroke?: string
  strokeWidthMM?: number
  start?: CurvePoint
  end?: CurvePoint
  control?: CurvePoint
  x?: number
  y?: number
}

/**
 * 曲线元素实现：二阶贝塞尔（quadratic），由起点/控制点/终点定义曲线。
 * 点坐标使用相对元素宽高的归一化值，缩放/改尺寸时曲线跟随元素等比例变化。
 */
export class CurveElement extends BaseGraphicElement {
  public type = 'curve'
  public stroke: string = 'black'
  public strokeWidthMM: number = 0.2
  public start: CurvePoint = { x: 0, y: 0.5 }
  public end: CurvePoint = { x: 1, y: 0.5 }
  public control: CurvePoint = { x: 0.5, y: 0 }

  constructor(host: EditorHost, options: Partial<CurveOptions> = {}) {
    super(host, {
      xmm: options.xmm ?? options.x ?? 5,
      ymm: options.ymm ?? options.y ?? 5,
      wmm: options.wmm ?? 30,
      hmm: options.hmm ?? 12,
      rotation: options.rotation,
      scaleX: options.scaleX,
      scaleY: options.scaleY,
      visible: options.visible,
      locked: options.locked,
      draggable: options.draggable,
      resizable: options.resizable,
    })
    this.stroke = options.stroke ?? this.stroke
    this.strokeWidthMM = options.strokeWidthMM ?? this.strokeWidthMM
    // 钢笔式编辑：不在外边显示缩放锚点，尺寸通过属性面板调整
    this.resizeAnchors = []
    this.start = options.start ? { ...options.start } : { x: 0, y: 0.5 }
    this.end = options.end ? { ...options.end } : { x: 1, y: 0.5 }
    this.control = options.control ? { ...options.control } : { x: 0.5, y: 0 }
  }

  public get strokeWidth() {
    return Math.max(1, Math.round(this.strokeWidthMM * this.host.status.dpm))
  }

  public get hitStrokeWidth() {
    const zoom = Math.max(this.host.status.zoom, 0.001)
    return Math.max(this.strokeWidth, 10 / zoom)
  }

  public get startPoint() {
    return {
      x: this.start.x * this.width,
      y: this.start.y * this.height,
    }
  }

  public get endPoint() {
    return {
      x: this.end.x * this.width,
      y: this.end.y * this.height,
    }
  }

  public get controlPoint() {
    return {
      x: this.control.x * this.width,
      y: this.control.y * this.height,
    }
  }

  // v-group 配置：id 放在 group 上供 selection / transform overlay 命中
  public get groupConfig() {
    return {
      ...super.config,
    }
  }

  // 曲线实际可见范围（含起点/终点/控制点，并留出线宽与点击余量）
  public get curveBounds() {
    const points = [this.startPoint, this.controlPoint, this.endPoint]
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const padding = Math.max(this.strokeWidth, 4)
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    }
  }

  // 透明命中矩形：覆盖曲线实际绘制区域，避免点被拖出后无法再次选中
  public get hitRectConfig() {
    return {
      ...this.curveBounds,
      fill: 'transparent',
    }
  }

  // v-shape 配置：sceneFunc 绘制二阶贝塞尔曲线
  public get curveShapeConfig() {
    const start = this.startPoint
    const end = this.endPoint
    const control = this.controlPoint

    return {
      sceneFunc: (context: konva.Context, shape: konva.Shape) => {
        context.beginPath()
        context.moveTo(start.x, start.y)
        context.quadraticCurveTo(control.x, control.y, end.x, end.y)
        context.fillStrokeShape(shape)
      },
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      hitStrokeWidth: this.hitStrokeWidth,
    }
  }

  deserialize(data: Record<string, unknown>): void {
    super.deserialize(data)
    this.stroke = (data.stroke as string) ?? 'black'
    this.strokeWidthMM = (data.strokeWidthMM as number) ?? 0.2

    const start = data.start as Partial<CurvePoint> | undefined
    const end = data.end as Partial<CurvePoint> | undefined
    const control = data.control as Partial<CurvePoint> | undefined

    this.start = { x: start?.x ?? 0, y: start?.y ?? 0.5 }
    this.end = { x: end?.x ?? 1, y: end?.y ?? 0.5 }
    this.control = { x: control?.x ?? 0.5, y: control?.y ?? 0 }
  }

  serialize() {
    return {
      ...super.serialize(),
      stroke: this.stroke,
      strokeWidthMM: this.strokeWidthMM,
      start: { ...this.start },
      end: { ...this.end },
      control: { ...this.control },
    }
  }
}

export class CurvePlugin extends GraphicPlugin<CurveElement> {
  public name = 'curve-plugin'
  public version = '1.0.0'
  public graphicType = 'curve'
  public graphicElement = CurveElement
  public shapeComponent = Shape
  public iconComponent = IconBezierCurve
  public typeDisplayName = '曲线'
  public propertyPanel = PropertyPanel
}

import { GraphicPlugin } from '@/types/graphic-plugin'
import { BaseGraphicElement, type BaseGraphicElementOptions } from '@/types/base-graphic-element'
import PropertyPanel from './PropertyPanel.vue'
import Shape from './Shape.vue'
import IconImage from '~icons/ph/image-light'
import type { EditorHost } from '@/core'

export interface ImageOptions extends BaseGraphicElementOptions {
  src?: string
  alt?: string
  cornerRadiusMM?: number
}

// 图片元素实现：src 支持 URL 或 data URL，Shape 负责异步加载并渲染为 Konva Image
export class ImageElement extends BaseGraphicElement {
  public type = 'image'
  public src: string = ''
  public alt: string = ''
  public cornerRadiusMM: number = 0

  constructor(host: EditorHost, options: Partial<ImageOptions> = {}) {
    super(host, {
      xmm: options.xmm ?? 5,
      ymm: options.ymm ?? 5,
      wmm: options.wmm ?? 30,
      hmm: options.hmm ?? 20,
      rotation: options.rotation,
      scaleX: options.scaleX,
      scaleY: options.scaleY,
      visible: options.visible,
      locked: options.locked,
      draggable: options.draggable,
      resizable: options.resizable,
      zIndex: options.zIndex,
      displayName: options.displayName,
    })
    this.src = options.src ?? this.src
    this.alt = options.alt ?? this.alt
    this.cornerRadiusMM = options.cornerRadiusMM ?? this.cornerRadiusMM
  }

  public get cornerRadius() {
    return Math.max(0, Math.round(this.cornerRadiusMM * this.host.status.dpm))
  }

  // v-group 配置：id 放在 group 上供 selection / transform overlay 命中
  public get groupConfig() {
    return {
      ...super.config,
    }
  }

  deserialize(data: Record<string, unknown>): void {
    super.deserialize(data)
    this.src = (data.src as string) ?? ''
    this.alt = (data.alt as string) ?? ''
    this.cornerRadiusMM = (data.cornerRadiusMM as number) ?? 0
  }

  serialize() {
    return {
      ...super.serialize(),
      src: this.src,
      alt: this.alt,
      cornerRadiusMM: this.cornerRadiusMM,
    }
  }
}

export class ImagePlugin extends GraphicPlugin<ImageElement> {
  public name = 'image-plugin'
  public version = '1.0.0'
  public graphicType = 'image'
  public graphicElement = ImageElement
  public shapeComponent = Shape
  public iconComponent = IconImage
  public typeDisplayName = '图片'
  public propertyPanel = PropertyPanel
}

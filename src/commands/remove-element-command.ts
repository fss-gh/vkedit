/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseCommand } from './base-command'
import type { IGraphicElement } from '../types'
import { type EditorHost } from '@/core'
import type { GraphicRegistryPlugin } from '@/plugins/graphic-registry'
export class RemoveElementCommand extends BaseCommand {
  public name = 'REMOVE_ELEMENT'
  private elementData: any
  private elementsPlugin: GraphicRegistryPlugin | null
  private childElements: IGraphicElement[] = []

  constructor(
    host: EditorHost,
    private element: IGraphicElement,
  ) {
    super(host, '删除元素')
    this.elementsPlugin = host.getPlugin('graphic-registry-plugin') as GraphicRegistryPlugin
    this.element = element
    const childIds = (this.element as { childIds?: string[] }).childIds
    if (Array.isArray(childIds)) {
      for (const id of childIds) {
        try {
          const child = this.elementsPlugin?.getElement(id)
          if (child) this.childElements.push(child)
        } catch {
          // 子元素可能已不存在，跳过
        }
      }
    }
  }

  execute(): void {
    for (const child of this.childElements) {
      this.elementsPlugin?.removeElement(child.id)
      this.host.emit('element:removed', {
        element: child,
        elementId: child.id,
        timestamp: this.timestamp,
        source: 'remove-element-command-execute',
      })
    }
    this.elementsPlugin?.removeElement(this.element.id)
    this.host.emit('element:removed', {
      element: this.element,
      elementId: this.element.id,
      timestamp: this.timestamp,
      source: 'remove-element-command-execute',
    })
  }

  undo(): void {
    this.elementsPlugin?.addElement(this.element)
    this.host.emit('element:added', {
      element: this.element,
      elementId: this.element.id,
      timestamp: this.timestamp,
      source: 'remove-element-command-undo',
    })
    for (const child of this.childElements) {
      this.elementsPlugin?.addElement(child)
      this.host.emit('element:added', {
        element: child,
        elementId: child.id,
        timestamp: this.timestamp,
        source: 'remove-element-command-undo',
      })
    }
  }
}

import { UpdateCanvasPropertyCommand, type CanvasPropertyPath } from '@/commands'
import type { EditorHost } from '@/core'
import type { IEditorState } from '@/types'

export function useCanvasPropertyCommand(host: EditorHost) {
  const updateCanvasProperty = (propertyPath: CanvasPropertyPath, newValue: number | boolean) => {
    const oldValue = host.status[propertyPath]
    if (oldValue === newValue) return

    const oldState = {
      dpm: host.status.dpm,
      width: host.status.width,
      height: host.status.height,
      wmm: host.status.wmm,
      hmm: host.status.hmm,
      showGrid: host.status.showGrid,
    }

    const newStatus = { [propertyPath]: newValue } as Partial<IEditorState>

    host.executeCommand(
      new UpdateCanvasPropertyCommand(host, propertyPath, oldState, newStatus),
    )
  }

  return { updateCanvasProperty }
}

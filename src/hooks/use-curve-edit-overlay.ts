import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { EditorHost } from '@/core'
import type { IGraphicElement } from '@/types'
import { useZoom } from '@/hooks/use-zoom'
import { contentToViewport, viewportToContent } from '@/utils/transform-geometry'
import { cssColorVar } from '@/utils/css-var'
import { UpdatePropertyCommand } from '@/commands'
import type { SelectionPlugin } from '@/plugins/selection'

export interface CurveEditPoint {
  x: number
  y: number
}

export interface CurveEditableElement extends IGraphicElement {
  start: CurveEditPoint
  end: CurveEditPoint
  control: CurveEditPoint
}

export type CurveHandleId = 'start' | 'end' | 'control'

export interface CurveHandleView {
  id: CurveHandleId
  x: number
  y: number
  radius: number
  fill: string
  stroke: string
}

export interface CurveEditOverlayViewModel {
  visible: boolean
  start: { x: number; y: number }
  end: { x: number; y: number }
  control: { x: number; y: number }
  controlLines: { points: number[]; stroke: string; strokeWidth: number; dash: number[] } | null
  handles: CurveHandleView[]
}

export interface CurveStageLike {
  getPointerPosition?: () => { x: number; y: number } | null
  getNode?: () => CurveStageLike | null
}

export interface CurvePointerEvent {
  cancelBubble?: boolean
  target?: {
    getStage?: () => CurveStageLike | null
  }
}

export function useCurveEditOverlay(host: EditorHost) {
  const selectedElements = ref<IGraphicElement[]>([])
  const tick = ref(0)
  const { contentX, contentY, zoom } = useZoom(host)

  const vp = () => ({
    contentX: contentX.value,
    contentY: contentY.value,
    zoom: zoom.value,
  })

  const isCurveElement = (element: IGraphicElement): element is CurveEditableElement => {
    return (
      element.type === 'curve' &&
      'start' in element &&
      'end' in element &&
      'control' in element
    )
  }

  function normalizedToContent(element: CurveEditableElement, point: CurveEditPoint) {
    const lx = point.x * element.width
    const ly = point.y * element.height
    const sx = lx * (element.scaleX || 1)
    const sy = ly * (element.scaleY || 1)
    const rad = ((element.rotation || 0) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return {
      x: element.x + sx * cos - sy * sin,
      y: element.y + sx * sin + sy * cos,
    }
  }

  function contentToNormalized(element: CurveEditableElement, point: { x: number; y: number }) {
    const rad = ((element.rotation || 0) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const dx = point.x - element.x
    const dy = point.y - element.y
    const localX = dx * cos + dy * sin
    const localY = -dx * sin + dy * cos
    const scaleX = element.scaleX || 1
    const scaleY = element.scaleY || 1
    return {
      x: localX / scaleX / (element.width || 1),
      y: localY / scaleY / (element.height || 1),
    }
  }

  const overlay = computed<CurveEditOverlayViewModel>(() => {
    void tick.value
    void contentX.value
    void contentY.value
    void zoom.value

    const element =
      selectedElements.value.length === 1 ? selectedElements.value[0] : null
    if (!element || !isCurveElement(element)) {
      return {
        visible: false,
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
        control: { x: 0, y: 0 },
        controlLines: null,
        handles: [],
      }
    }

    const startContent = normalizedToContent(element, element.start)
    const endContent = normalizedToContent(element, element.end)
    const controlContent = normalizedToContent(element, element.control)

    const start = contentToViewport(startContent.x, startContent.y, vp())
    const end = contentToViewport(endContent.x, endContent.y, vp())
    const control = contentToViewport(controlContent.x, controlContent.y, vp())

    const primary =
      cssColorVar('--vkedit-color-primary', host.stageState.wrapperEl) || '#2563eb'
    const controlColor =
      cssColorVar('--vkedit-color-warning', host.stageState.wrapperEl) || '#d97706'
    const guideColor =
      cssColorVar('--vkedit-color-border', host.stageState.wrapperEl) || '#9ca3af'

    return {
      visible: true,
      start,
      end,
      control,
      controlLines: {
        points: [start.x, start.y, control.x, control.y, end.x, end.y],
        stroke: guideColor,
        strokeWidth: 1,
        dash: [4, 4],
      },
      handles: [
        { id: 'start', x: start.x, y: start.y, radius: 6, fill: '#ffffff', stroke: primary },
        { id: 'end', x: end.x, y: end.y, radius: 6, fill: '#ffffff', stroke: primary },
        { id: 'control', x: control.x, y: control.y, radius: 5, fill: '#ffffff', stroke: controlColor },
      ],
    }
  })

  const refreshOverlay = () => {
    tick.value++
  }

  interface CurveHandleSession {
    element: CurveEditableElement
    handle: CurveHandleId
    oldPoint: CurveEditPoint
    moved: boolean
  }

  let session: CurveHandleSession | null = null
  let gestureStage: CurveStageLike | null = null

  function onHandlePointerDown(handle: CurveHandleId, event: CurvePointerEvent) {
    const element =
      selectedElements.value.length === 1 ? selectedElements.value[0] : null
    if (!element || !isCurveElement(element) || element.locked) return

    if (event.cancelBubble !== undefined) event.cancelBubble = true
    const hostStage = host.stage as unknown as CurveStageLike | null
    const stage =
      event.target?.getStage?.() ??
      hostStage?.getNode?.() ??
      (hostStage as CurveStageLike | null)
    const pointer = stage?.getPointerPosition?.()
    if (!pointer) return

    session = {
      element,
      handle,
      oldPoint: { ...element[handle] },
      moved: false,
    }
    gestureStage = stage
    window.addEventListener('mousemove', onWindowMove)
    window.addEventListener('mouseup', onWindowUp)
  }

  function onWindowMove() {
    if (!session) return
    const pointer = gestureStage?.getPointerPosition?.()
    if (!pointer) return

    const point = viewportToContent(pointer.x, pointer.y, vp())
    const normalized = contentToNormalized(session.element, point)
    const target = session.element[session.handle]

    if (target.x !== normalized.x || target.y !== normalized.y) {
      target.x = normalized.x
      target.y = normalized.y
      session.moved = true
    }
    refreshOverlay()
  }

  function onWindowUp() {
    if (session) {
      const s = session
      if (s.moved) {
        const newPoint = { ...s.element[s.handle] }
        host.executeCommand(new UpdatePropertyCommand(host, s.element, s.handle, s.oldPoint, newPoint))
      }
      session = null
      gestureStage = null
      window.removeEventListener('mousemove', onWindowMove)
      window.removeEventListener('mouseup', onWindowUp)
    }
  }

  const handleSelectionChanged = (event: { selection?: IGraphicElement[] }) => {
    selectedElements.value = event.selection || []
  }

  const handleElementChanged = () => {
    selectedElements.value = [...selectedElements.value]
    refreshOverlay()
  }

  onMounted(() => {
    const selectionPlugin = host.getPlugin<SelectionPlugin>('selection-plugin')
    selectedElements.value = selectionPlugin.getSelectionElements()

    host.on('selection:changed', handleSelectionChanged)
    host.on('element:updated', handleElementChanged)
    host.on('element:transformed', handleElementChanged)
    host.on('element:dragmove', handleElementChanged)
    host.on('elements:align', handleElementChanged)
    host.on('elements:distribute', handleElementChanged)
    host.on('command:undone', handleElementChanged)
    host.on('command:redone', handleElementChanged)
  })

  onUnmounted(() => {
    if (session) {
      window.removeEventListener('mousemove', onWindowMove)
      window.removeEventListener('mouseup', onWindowUp)
      session = null
    }
    host.off('selection:changed', handleSelectionChanged)
    host.off('element:updated', handleElementChanged)
    host.off('element:transformed', handleElementChanged)
    host.off('element:dragmove', handleElementChanged)
    host.off('elements:align', handleElementChanged)
    host.off('elements:distribute', handleElementChanged)
    host.off('command:undone', handleElementChanged)
    host.off('command:redone', handleElementChanged)
  })

  return {
    overlay,
    onHandlePointerDown,
  }
}

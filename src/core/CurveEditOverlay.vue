<template>
  <v-group v-if="overlay.visible" :config="groupConfig">
    <v-line
      v-if="overlay.controlLines"
      :config="{
        ...overlay.controlLines,
        listening: false,
      }"
    />
    <v-circle
      v-for="handle in overlay.handles"
      :key="handle.id"
      :config="handleConfig(handle)"
    />
  </v-group>
</template>

<script setup lang="ts">
import type { EditorHost } from '@/core'
import {
  useCurveEditOverlay,
  type CurveHandleView,
  type CurvePointerEvent,
} from '@/hooks/use-curve-edit-overlay'

const props = defineProps<{ host: EditorHost }>()

const { overlay, onHandlePointerDown } = useCurveEditOverlay(props.host)

const groupConfig = {
  name: 'curve-edit-overlay',
  id: 'curve-edit-overlay',
  listening: true,
}

const handleConfig = (handle: CurveHandleView) => ({
  x: handle.x,
  y: handle.y,
  radius: handle.radius,
  fill: handle.fill,
  stroke: handle.stroke,
  strokeWidth: 1.5,
  listening: true,
  name: 'curve-edit-overlay-handle',
  onMousedown: (event: CurvePointerEvent) => onHandlePointerDown(handle.id, event),
})
</script>

<style scoped></style>

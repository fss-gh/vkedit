<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-group :config="groupConfig">
    <v-rect v-if="!image" :config="placeholderConfig" />
    <v-image v-if="image" :config="imageConfig" />
  </v-group>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ShapeProps } from '@/types/shape-props'
import type { ElementUpdateEventData } from '@/types/event-data'
import type { ImageElement } from './image'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Props extends ShapeProps<ImageElement> {}

const { host, element } = defineProps<Props>()
const image = ref<HTMLImageElement>()
const renderTick = ref(0)
let loadId = 0

const groupConfig = computed(() => {
  void renderTick.value
  const radius = element.cornerRadius
  if (radius <= 0) return element.groupConfig

  return {
    ...element.groupConfig,
    clipFunc: (ctx: CanvasRenderingContext2D) => {
      const width = element.width
      const height = element.height
      const r = Math.min(radius, width / 2, height / 2)

      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.lineTo(width - r, 0)
      ctx.arcTo(width, 0, width, r, r)
      ctx.lineTo(width, height - r)
      ctx.arcTo(width, height, width - r, height, r)
      ctx.lineTo(r, height)
      ctx.arcTo(0, height, 0, height - r, r)
      ctx.lineTo(0, r)
      ctx.arcTo(0, 0, r, 0, r)
      ctx.closePath()
    },
  }
})

const placeholderConfig = computed(() => {
  void renderTick.value
  return {
    x: 0,
    y: 0,
    width: element.width,
    height: element.height,
    fill: '#f5f5f5',
    stroke: '#c0c4cc',
    strokeWidth: 1,
    dash: [4, 4],
  }
})

const imageConfig = computed(() => {
  void renderTick.value
  return {
    x: 0,
    y: 0,
    width: element.width,
    height: element.height,
    image: image.value,
  }
})

function loadImage() {
  const src = element.src
  const id = ++loadId

  if (!src) {
    image.value = undefined
    return
  }

  const img = new Image()
  img.onload = () => {
    if (id === loadId) image.value = img
  }
  img.onerror = () => {
    if (id === loadId) image.value = undefined
  }
  img.src = src
}

function handleElementUpdated(data: ElementUpdateEventData) {
  if (!data || data.elementId !== element.id) return

  // 元素模型更新后强制刷新配置（位置/尺寸等由外部命令修改，Shape 保持纯渲染）
  renderTick.value++

  if (data.updatedProperties.includes('src')) {
    loadImage()
  }
}

onMounted(() => {
  loadImage()
  host.on('element:updated', handleElementUpdated)
})

onUnmounted(() => {
  host.off('element:updated', handleElementUpdated)
})
</script>

<style scoped></style>

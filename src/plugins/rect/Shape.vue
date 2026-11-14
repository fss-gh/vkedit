<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-rect :config="rectConfig" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ShapeProps } from '@/types/shape-props'
import type { ElementUpdateEventData } from '@/types/event-data'
import type { RectElement } from './rect'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Props extends ShapeProps<RectElement> {}

const { element, host } = defineProps<Props>()

const backgroundImage = ref<HTMLImageElement>()
const renderTick = ref(0)
let loadId = 0

const rectConfig = computed(() => {
  void renderTick.value
  const base = element.config
  const img = element.backgroundImage ? backgroundImage.value : undefined

  return {
    ...base,
    // 有背景图片时隐藏填充色，避免填充色盖住背景图片
    fill: img ? '' : base.fill,
    // 始终显式携带 pattern 属性，避免清除后 Konva 残留旧 pattern / 旧缩放
    fillPatternImage: img,
    fillPatternRepeat: 'no-repeat',
    fillPatternOffsetX: 0,
    fillPatternOffsetY: 0,
    fillPatternScaleX: img ? element.width / (img.width || 1) : 1,
    fillPatternScaleY: img ? element.height / (img.height || 1) : 1,
  }
})

function loadBackgroundImage() {
  const src = element.backgroundImage
  const id = ++loadId

  if (!src) {
    backgroundImage.value = undefined
    return
  }

  const img = new Image()
  img.onload = () => {
    if (id === loadId) backgroundImage.value = img
  }
  img.onerror = () => {
    if (id === loadId) backgroundImage.value = undefined
  }
  img.src = src
}

function handleElementUpdated(data: ElementUpdateEventData) {
  if (!data || data.elementId !== element.id) return

  // 元素模型更新后强制刷新配置（位置/尺寸等由外部命令修改，Shape 保持纯渲染）
  renderTick.value++

  if (data.updatedProperties.includes('backgroundImage')) {
    loadBackgroundImage()
  }
}

onMounted(() => {
  loadBackgroundImage()
  host.on('element:updated', handleElementUpdated)
})

onUnmounted(() => {
  host.off('element:updated', handleElementUpdated)
})
</script>

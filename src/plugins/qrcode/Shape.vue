<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-group :config="groupConfig">
    <v-image v-if="image" :config="imageConfig" />
  </v-group>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ShapeProps } from '@/types/shape-props'
import type { QrcodeElement } from './qrcode'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Props extends ShapeProps<QrcodeElement> {}

const { element } = defineProps<Props>()

const image = ref<HTMLCanvasElement>()
let renderId = 0

// 整体变换配置：id 放在 group 上，供 selection / transformer 命中
const groupConfig = computed(() => ({
  ...element.config,
}))

// 二维码位图：相对 group 原点 (0,0) 放置，尺寸取元素宽高
const imageConfig = computed(() => ({
  image: image.value,
  width: element.width,
  height: element.width,
}))

async function renderQr() {
  const id = ++renderId
  try {
    const canvas = await element.renderQrcode()
    if (id === renderId) image.value = canvas
  } catch {
    // 渲染失败时保留上一次二维码
  }
}

onMounted(() => {
  renderQr()
})

watch(
  () => [
    element.content,
    element.foreground,
    element.background,
    element.wmm,
    element.hmm,
    element.marginMM,
    element.errorCorrectionLevel,
    element.iconSrc,
  ],
  renderQr,
)
</script>

<style scoped></style>

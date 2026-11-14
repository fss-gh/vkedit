<template>
  <div class="vkedit-property__title">曲线属性</div>
  <div></div>
  <div>
    <VkLabel>宽度</VkLabel>
    <VkInputNumberMM
      :model-value="element.wmm"
      :min="1"
      @update:model-value="(value) => batchUpdateProperty(selection, 'wmm', value)"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>高度</VkLabel>
    <VkInputNumberMM
      :model-value="element.hmm"
      :min="1"
      @update:model-value="(value) => batchUpdateProperty(selection, 'hmm', value)"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>线宽</VkLabel>
    <VkInputNumberMM
      :model-value="element.strokeWidthMM"
      :min="0.1"
      @update:model-value="(value) => batchUpdateProperty(selection, 'strokeWidthMM', value)"
    >
    </VkInputNumberMM>
  </div>
  <div class="vkedit-property__col-full">
    <VkColorPicker
      :model-value="element.stroke"
      label="线条颜色"
      @update:model-value="(value) => batchUpdateProperty(selection, 'stroke', value ?? '#000000')"
    />
  </div>
  <!-- <div>
    <VkLabel>起点 X</VkLabel>
    <VkInputNumberMM
      :model-value="element.start.x * element.wmm"
      :min="0"
      @update:model-value="onStartXChange"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>起点 Y</VkLabel>
    <VkInputNumberMM
      :model-value="element.start.y * element.hmm"
      :min="0"
      @update:model-value="onStartYChange"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>终点 X</VkLabel>
    <VkInputNumberMM
      :model-value="element.end.x * element.wmm"
      :min="0"
      @update:model-value="onEndXChange"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>终点 Y</VkLabel>
    <VkInputNumberMM
      :model-value="element.end.y * element.hmm"
      :min="0"
      @update:model-value="onEndYChange"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>控制点 X</VkLabel>
    <VkInputNumberMM
      :model-value="element.control.x * element.wmm"
      :min="0"
      @update:model-value="onControlXChange"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>控制点 Y</VkLabel>
    <VkInputNumberMM
      :model-value="element.control.y * element.hmm"
      :min="0"
      @update:model-value="onControlYChange"
    >
    </VkInputNumberMM>
  </div> -->
</template>

<script setup lang="ts">
import type { EditorHost } from '@/core'
import type { CurveElement } from './curve'
import { VkInputNumberMM, VkLabel, VkColorPicker } from '@/components/ui'
import { usePropertyCommand } from '@/hooks'

export interface Props {
  host: EditorHost
  element: CurveElement
  selection: CurveElement[]
}

const { element, host, selection } = defineProps<Props>()
const { batchUpdateProperty } = usePropertyCommand(host)

// function onStartXChange(value: number) {
//   batchUpdateProperty(selection, 'start.x', element.wmm ? value / element.wmm : 0)
// }

// function onStartYChange(value: number) {
//   batchUpdateProperty(selection, 'start.y', element.hmm ? value / element.hmm : 0)
// }

// function onEndXChange(value: number) {
//   batchUpdateProperty(selection, 'end.x', element.wmm ? value / element.wmm : 0)
// }

// function onEndYChange(value: number) {
//   batchUpdateProperty(selection, 'end.y', element.hmm ? value / element.hmm : 0)
// }

// function onControlXChange(value: number) {
//   batchUpdateProperty(selection, 'control.x', element.wmm ? value / element.wmm : 0)
// }

// function onControlYChange(value: number) {
//   batchUpdateProperty(selection, 'control.y', element.hmm ? value / element.hmm : 0)
// }
</script>

<style scoped></style>

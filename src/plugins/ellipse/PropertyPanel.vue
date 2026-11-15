<template>
  <div class="vkedit-property__title">圆形属性</div>
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
  <div class="vkedit-property__col-full vkedit-ellipse-property__hint">
    宽度 = 高度时显示为正圆，否则显示为椭圆
  </div>
  <div>
    <VkLabel>边框粗细</VkLabel>
    <VkInputNumberMM
      :model-value="element.strokeWidthMM"
      :min="0"
      :step="0.1"
      @update:model-value="(value) => batchUpdateProperty(selection, 'strokeWidthMM', value)"
    >
    </VkInputNumberMM>
  </div>
  <div class="vkedit-property__col-full">
    <VkColorPicker
      :model-value="element.stroke"
      label="边框颜色"
      @update:model-value="(value) => batchUpdateProperty(selection, 'stroke', value ?? '#000000')"
    />
  </div>
  <div class="vkedit-property__col-full">
    <VkColorPicker
      :model-value="isNoneFill ? null : element.fill"
      label="填充颜色"
      :allow-none="true"
      @update:model-value="handleFillChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditorHost } from '@/core'
import type { EllipseElement } from './ellipse'
import { VkColorPicker, VkInputNumberMM, VkLabel } from '@/components/ui'
import { usePropertyCommand } from '@/hooks/use-property-command'

export interface Props {
  host: EditorHost
  element: EllipseElement
  selection: EllipseElement[]
}

const { element, host, selection } = defineProps<Props>()

const { batchUpdateProperty } = usePropertyCommand(host)

// 旧模板或空 fill 字符串均视为无填充
const isNoneFill = computed(() => !element.fill || element.fill === '')

function handleFillChange(value: string | null) {
  if (value === null) {
    batchUpdateProperty(selection, 'fill', '')
  } else {
    batchUpdateProperty(selection, 'fill', value)
  }
}
</script>

<style scoped>
.vkedit-ellipse-property__hint {
  font-size: var(--vkedit-font-size-xs);
  color: var(--vkedit-color-text-secondary, #666);
  line-height: 1.4;
}
</style>

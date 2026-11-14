<template>
  <div class="vkedit-property__title">线条属性</div>
  <div></div>
  <div>
    <Label>粗细</Label>
    <VkInputNumberMM
      :model-value="element.hmm"
      :min="0.1"
      @update:model-value="(value) => batchUpdateProperty(selection, 'hmm', value)"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <Label>长度</Label>
    <VkInputNumberMM
      :model-value="element.wmm"
      :min="1"
      @update:model-value="(value) => batchUpdateProperty(selection, 'wmm', value)"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <Label>角度</Label>
    <VkInputNumber
      :model-value="element.rotation"
      @update:model-value="(value) => batchUpdateProperty(selection, 'rotation', value)"
    >
    </VkInputNumber>
  </div>
  <div>
    <Label>线条类型</Label>
    <VkSelect :model-value="element.lineType" @update:model-value="onLineTypeChange">
      <option value="solid">实线</option>
      <option value="dashed">虚线</option>
    </VkSelect>
  </div>
  <div class="vkedit-property__col-full">
    <VkColorPicker
      :model-value="element.stroke"
      label="线条颜色"
      @update:model-value="(value) => batchUpdateProperty(selection, 'stroke', value ?? '#000000')"
    />
  </div>
</template>

<script setup lang="ts">
import type { EditorHost } from '@/core'
import type { LineElement } from './line'
import { VkInputNumber, VkInputNumberMM, VkSelect, VkColorPicker } from '@/components/ui'
import { usePropertyCommand } from '@/hooks'

export interface Props {
  host: EditorHost
  element: LineElement
  selection: LineElement[]
}
const { element, host, selection } = defineProps<Props>()
const { batchUpdateProperty } = usePropertyCommand(host)

function onLineTypeChange(value: string) {
  batchUpdateProperty(selection, 'lineType', value)
}
</script>

<style scoped></style>
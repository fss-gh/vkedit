<template>
  <div class="vkedit-property__title">矩形属性</div>
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
    <VkLabel>圆角</VkLabel>
    <VkInputNumberMM
      :model-value="element.cornerRadiusMM"
      :min="0"
      :step="0.1"
      @update:model-value="(value) => batchUpdateProperty(selection, 'cornerRadiusMM', value)"
    >
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>边框粗细</VkLabel>
    <VkInputNumberMM
      :model-value="element.strokeWidthMM"
      :min="1"
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
      @update:model-value="(value) => handleFillChange(value)"
    />
  </div>
  <div class="vkedit-property__col-full">
    <VkLabel>背景图片</VkLabel>
    <div class="vkedit-rect-property__row">
      <VkInput
        class="vkedit-rect-property__input"
        :model-value="element.backgroundImage"
        placeholder="图片 URL 或 data URL"
        @update:model-value="onBackgroundImageChange"
      />
      <VkButton size="sm" variant="outline" @click="openFilePicker">上传</VkButton>
      <VkButton
        v-if="element.backgroundImage"
        size="sm"
        variant="outline"
        @click="clearBackgroundImage"
      >
        清除
      </VkButton>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="vkedit-rect-property__file-input"
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EditorHost } from '@/core'
import type { RectElement } from './rect'
import { VkButton, VkColorPicker, VkInput, VkInputNumberMM, VkLabel } from '@/components/ui'
import { usePropertyCommand } from '@/hooks/use-property-command'

export interface Props {
  host: EditorHost
  element: RectElement
  selection: RectElement[]
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

const fileInput = ref<HTMLInputElement>()

function onBackgroundImageChange(value: string | number) {
  batchUpdateProperty(selection, 'backgroundImage', String(value ?? ''))
}

function openFilePicker() {
  fileInput.value?.click()
}

function clearBackgroundImage() {
  batchUpdateProperty(selection, 'backgroundImage', '')
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      batchUpdateProperty(selection, 'backgroundImage', reader.result)
    }
    input.value = ''
  }
  reader.onerror = () => {
    input.value = ''
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.vkedit-rect-property__row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.vkedit-rect-property__input {
  flex: 1;
  min-width: 0;
}

.vkedit-rect-property__file-input {
  display: none;
}
</style>
<template>
  <div class="vkedit-property__title">图片属性</div>
  <div class="vkedit-property__col-full">
    <VkLabel>图片来源</VkLabel>
    <div class="vkedit-image-property__row">
      <VkInput
        class="vkedit-image-property__input"
        :model-value="element.src"
        placeholder="图片 URL 或 data URL"
        @update:model-value="onSrcChange"
      />
      <VkButton size="sm" variant="outline" @click="openFilePicker">上传</VkButton>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="vkedit-image-property__file-input"
      @change="onFileChange"
    />
  </div>
  <div>
    <VkLabel>圆角</VkLabel>
    <VkInputNumberMM
      :min="0"
      :step="0.1"
      :model-value="element.cornerRadiusMM"
      @update:model-value="onCornerRadiusChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EditorHost } from '@/core'
import type { ImageElement } from './image'
import { usePropertyCommand } from '@/hooks'
import { VkButton, VkInput, VkInputNumberMM, VkLabel } from '@/components/ui'

export interface Props {
  host: EditorHost
  element: ImageElement
  selection: ImageElement[]
}

const { host, element, selection } = defineProps<Props>()
const { batchUpdateProperty } = usePropertyCommand(host)
const fileInput = ref<HTMLInputElement>()

function onSrcChange(value: string | number) {
  batchUpdateProperty(selection, 'src', String(value ?? ''))
}

function openFilePicker() {
  fileInput.value?.click()
}

function onCornerRadiusChange(value: number) {
  batchUpdateProperty(selection, 'cornerRadiusMM', value)
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      batchUpdateProperty(selection, 'src', reader.result)
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
.vkedit-image-property__row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.vkedit-image-property__input {
  flex: 1;
  min-width: 0;
}

.vkedit-image-property__file-input {
  display: none;
}
</style>

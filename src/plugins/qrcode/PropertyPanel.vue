<template>
  <DisplayNameProperty :host="host" :element="element" :selection="selection" />
  <div class="vkedit-property__col-full">二维码属性</div>
  <div class="vkedit-property__col-full">
    <VkLabel>内容</VkLabel>
    <VkInput :model-value="element.content" @update:model-value="onContentChange"> </VkInput>
  </div>
  <div class="vkedit-property__col-full">
    <VkLabel>可变性</VkLabel>
    <VkSwitch :model-value="element.variable" @update:model-value="(value) => batchUpdateProperty(selection, 'variable', value)" />
  </div>
  <div class="vkedit-property__col-full">
    <VkLabel>纠错等级</VkLabel>
    <VkSelect
      :model-value="element.errorCorrectionLevel"
      @update:model-value="onErrorCorrectionLevelChange"
    >
      <option value="L">L（约7%）</option>
      <option value="M">M（约15%）</option>
      <option value="Q">Q（约25%）</option>
      <option value="H">H（约30%）</option>
    </VkSelect>
  </div>
  <div>
    <VkLabel>大小</VkLabel>
    <VkInputNumberMM :min="0" :model-value="element.wmm" @update:model-value="onSizeChange">
    </VkInputNumberMM>
  </div>
  <div>
    <VkLabel>角度</VkLabel>
    <VkInputNumber
      :model-value="element.rotation"
      @update:model-value="(value) => batchUpdateProperty(selection, 'rotation', value)"
    >
    </VkInputNumber>
  </div>
  <div>
    <VkLabel>留白</VkLabel>
    <VkInputNumberMM
      :min="0"
      :model-value="element.marginMM"
      @update:model-value="onMarginMMUpdate"
    >
    </VkInputNumberMM>
  </div>
  <div class="vkedit-property__col-full">
    <VkColorPicker
      :model-value="element.foreground"
      label="前景色"
      @update:model-value="(value) => batchUpdateProperty(selection, 'foreground', value ?? '#000000')"
    />
  </div>
  <div class="vkedit-property__col-full">
    <VkColorPicker
      :model-value="element.background"
      label="背景色"
      @update:model-value="(value) => batchUpdateProperty(selection, 'background', value ?? '#ffffff')"
    />
  </div>
  <div class="vkedit-property__col-full">
    <VkLabel>中心图标</VkLabel>
    <div class="vkedit-qr-property__row">
      <VkInput
        class="vkedit-qr-property__input"
        :model-value="element.iconSrc"
        placeholder="图片 URL 或 data URL"
        @update:model-value="onIconSrcChange"
      />
      <VkButton size="sm" variant="outline" @click="openFilePicker">上传</VkButton>
      <VkButton v-if="element.iconSrc" size="sm" variant="outline" @click="clearIconSrc">
        清除
      </VkButton>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="vkedit-qr-property__file-input"
      @change="onFileChange"
    />
  </div>
  <div v-if="readabilityWarning" class="vkedit-property__col-full vkedit-property__warning">
    {{ readabilityWarning }}
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EditorHost } from '@/core'
import type { QRErrorCorrectionLevel, QrcodeElement } from './qrcode'
import { usePropertyCommand } from '@/hooks'
import {
  VkInputNumberMM,
  VkInput,
  VkLabel,
  VkInputNumber,
  VkColorPicker,
  VkButton,
  VkSelect,
  VkSwitch,
} from '../../components'
import { useReadabilityWarning } from '@/utils/readability'
import { DisplayNameProperty } from '@/components'

export interface Props {
  host: EditorHost
  element: QrcodeElement
  selection: QrcodeElement[]
}

const { host, element, selection } = defineProps<Props>()
const { batchUpdateProperty } = usePropertyCommand(host)

const foregroundRef = computed(() => element.foreground)
const backgroundRef = computed(() => element.background)
const readabilityWarning = useReadabilityWarning({
  foreground: foregroundRef,
  background: backgroundRef,
})

function onContentChange(value: string | number) {
  batchUpdateProperty(selection, 'content', value)
}

function onSizeChange(value: number) {
  batchUpdateProperty(selection, 'wmm', value)
}

function onMarginMMUpdate(value: number) {
  batchUpdateProperty(selection, 'marginMM', value)
}

function onErrorCorrectionLevelChange(value: string) {
  if (['L', 'M', 'Q', 'H'].includes(value)) {
    batchUpdateProperty(selection, 'errorCorrectionLevel', value as QRErrorCorrectionLevel)
  }
}

const fileInput = ref<HTMLInputElement>()

function onIconSrcChange(value: string | number) {
  batchUpdateProperty(selection, 'iconSrc', String(value ?? ''))
}

function openFilePicker() {
  fileInput.value?.click()
}

function clearIconSrc() {
  batchUpdateProperty(selection, 'iconSrc', '')
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      batchUpdateProperty(selection, 'iconSrc', reader.result)
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
.vkedit-qr-property__row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.vkedit-qr-property__input {
  flex: 1;
  min-width: 0;
}

.vkedit-qr-property__file-input {
  display: none;
}

.vkedit-property__warning {
  font-size: var(--vkedit-font-size-xs);
  color: var(--vkedit-color-warning);
  background: color-mix(in oklab, var(--vkedit-color-warning) 12%, transparent);
  padding: 4px 6px;
  border-radius: var(--vkedit-radius-sm);
  line-height: 1.4;
}
</style>
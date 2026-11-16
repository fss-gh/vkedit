<template>
  <div v-if="text !== undefined" class="vkedit-property__col-full" style="display: flex; flex-direction: column; gap: 4px">
    <VkLabel>文本内容</VkLabel>
    <VkTextarea
      :rows="3"
      :model-value="text"
      :placeholder="'请输入文本，支持回车换行'"
      @update:model-value="handleTextUpdate"
    ></VkTextarea>
  </div>
  <div class="vkedit-property__col-full" style="display: flex; align-items: center; justify-content: space-between">
    <VkLabel>可变性</VkLabel>
    <VkSwitch
      :model-value="variable ?? false"
      @update:model-value="(value) => emit('update', 'variable', value)"
    />
  </div>
  <div class="vkedit-property__col-full" style="display: flex; flex-direction: column; gap: 4px">
    <VkLabel>文字间距</VkLabel>
    <VkInputNumberMM
      :model-value="letterSpacingMM ?? 0"
      :min="0"
      @update:model-value="(value: number) => emit('update', 'letterSpacingMM', value)"
    ></VkInputNumberMM>
  </div>
  <div v-if="fill !== undefined" class="vkedit-property__col-full">
    <VkColorPicker
      :model-value="fill"
      label="文字颜色"
      @update:model-value="(value: string | null) => emit('update', 'fill', value ?? '#000000')"
    />
  </div>
  <div class="vkedit-property__col-full" style="display: flex; gap: 4px; min-width: 0">
    <div style="flex: 1; min-width: 0">
      <VkInputMM
        :model-value="fontSize"
        :min="0"
        :dpm="hostState.dpm"
        @update:model-value="(value: number) => emit('update', 'fontSize', value)"
      ></VkInputMM>
    </div>
    <VkToggle
      size="sm"
      :model-value="fontStyle?.includes('bold') ?? false"
      @update:model-value="toggleBold"
    >
      <IconFormatBold style="width: 20px; height: 20px" />
    </VkToggle>
    <VkToggle
      size="sm"
      :disabled="isCjkText"
      :model-value="(fontStyle?.includes('italic') ?? false) && !isCjkText"
      @update:model-value="toggleItalic"
    >
      <IconFormatItalic style="width: 20px; height: 20px" />
    </VkToggle>
  </div>
  <div class="vkedit-property__col-full" style="display: flex; gap: 1px; min-width: 0">
    <VkToggle
      size="sm"
      :model-value="align == 'left'"
      @update:model-value="emit('update', 'align', 'left')"
      ><IconAlignJustifyFlexStart style="width: 16px; height: 16px" /></VkToggle>
    <VkToggle
      size="sm"
      :model-value="align == 'center'"
      @update:model-value="emit('update', 'align', 'center')"
      ><IconAlignJustifyCenter style="width: 16px; height: 16px" /></VkToggle>
    <VkToggle
      size="sm"
      :model-value="align == 'right'"
      @update:model-value="emit('update', 'align', 'right')"
      ><IconAlignJustifyFlexEnd style="width: 16px; height: 16px" /></VkToggle>
    <VkToggle
      size="sm"
      :model-value="verticalAlign == 'top'"
      @update:model-value="emit('update', 'verticalAlign', 'top')"
      ><IconAlignStart style="width: 16px; height: 16px" /></VkToggle>
    <VkToggle
      size="sm"
      :model-value="verticalAlign == 'middle'"
      @update:model-value="emit('update', 'verticalAlign', 'middle')"
      ><IconAlignCenter style="width: 16px; height: 16px" /></VkToggle>
    <VkToggle
      size="sm"
      :model-value="verticalAlign == 'bottom'"
      @update:model-value="emit('update', 'verticalAlign', 'bottom')"
      ><IconAlignEnd style="width: 16px; height: 16px" /></VkToggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VkToggle, VkLabel, VkInputMM, VkInputNumberMM, VkColorPicker, VkTextarea, VkSwitch } from '@/components/ui'
import IconFormatBold from '~icons/ph/text-b-light'
import IconFormatItalic from '~icons/ph/text-italic-light'
import IconAlignJustifyFlexStart from '~icons/ph/text-align-left-light'
import IconAlignJustifyCenter from '~icons/ph/text-align-center-light'
import IconAlignJustifyFlexEnd from '~icons/ph/text-align-right-light'
import IconAlignStart from '~icons/ph/text-align-left-light'
import IconAlignCenter from '~icons/ph/text-align-center-light'
import IconAlignEnd from '~icons/ph/text-align-right-light'
import { useHostState } from '@/hooks'
import type { EditorHost } from '@/core'
import type { IAlign, IFontStyle, IVerticalAlign } from '@/types'
const {
  text,
  fill,
  fontSize,
  align,
  verticalAlign,
  fontStyle,
  host,
} = defineProps<{
  host: EditorHost
  text?: string
  fill?: string
  fontSize: number
  letterSpacingMM?: number
  align: IAlign
  verticalAlign: IVerticalAlign
  fontStyle?: IFontStyle // 文字加粗
  variable?: boolean
}>()

const emit = defineEmits<{
  update: [property: string, value: string | number | boolean | undefined]
}>()

const CJK_TEXT_PATTERN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/
const isCjkText = computed(() => CJK_TEXT_PATTERN.test(text ?? ''))

function buildFontStyle(bold: boolean, italic: boolean): IFontStyle {
  if (bold && italic) return 'italic bold'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

function handleTextUpdate(value: string) {
  emit('update', 'text', value)

  // 中文不允许斜体：输入中文时自动移除 italic
  if (CJK_TEXT_PATTERN.test(value) && fontStyle?.includes('italic')) {
    const hasBold = fontStyle.includes('bold')
    emit('update', 'fontStyle', hasBold ? 'bold' : 'normal')
  }
}

function toggleBold(value: boolean) {
  const hasItalic = fontStyle?.includes('italic') ?? false
  emit('update', 'fontStyle', buildFontStyle(value, hasItalic && !isCjkText.value))
}

function toggleItalic(value: boolean) {
  // 中文不允许使用斜体样式
  if (isCjkText.value) return
  const hasBold = fontStyle?.includes('bold') ?? false
  emit('update', 'fontStyle', buildFontStyle(hasBold, value))
}

// 获取 hostState 用于 dpm
const { hostState } = useHostState(host)
</script>

<style scoped></style>
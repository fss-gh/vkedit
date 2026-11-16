<template>
  <DisplayNameProperty :host="host" :element="element" :selection="selection" />
  <div class="vkedit-property__title">文本属性</div>
  <TextProperty
    :text="element.text"
    :fill="element.fill"
    :font-size="element.fontSize"
    :align="element.align"
    :font-style="element.fontStyle"
    :vertical-align="element.verticalAlign"
    :letterSpacingMM="element.letterSpacingMM"
    :variable="element.variable"
    :host="host"
    @update="(prop, value) => batchUpdateProperty(selection, prop, value)"
  ></TextProperty>
  <div class="vkedit-property__col-full vkedit-text-property__hint">
    为确保设计与打印的一致性，设置器文本组件字体固定为 Alibaba Sans（西文）+ Alibaba PuHuiTi（中文）（内置字体，无需系统安装），不可修改；中文内容不支持斜体，输入中文时自动关闭斜体。
  </div>
</template>

<script setup lang="ts">
import type { EditorHost } from '@/core'
import type { TextElement } from './text'
import { TextProperty, DisplayNameProperty } from '@/components'
import { usePropertyCommand } from '@/hooks'

export interface Props {
  host: EditorHost
  element: TextElement
  selection: TextElement[]
}

const { element, host, selection } = defineProps<Props>()
const { batchUpdateProperty } = usePropertyCommand(host)
</script>

<style scoped>
.vkedit-text-property__hint {
  font-size: var(--vkedit-font-size-xs);
  color: var(--vkedit-color-text-secondary, #666);
  line-height: 1.4;
}
</style>

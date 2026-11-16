<template>
  <VkDropdown>
    <template #trigger>
      <VkButton size="sm">打印测试</VkButton>
    </template>
    <div class="print-menu">
      <div class="print-menu__row">
        <span class="print-menu__label">打印数据 JSON</span>
        <VkButton size="sm" variant="outline" @click="selectDataFile">选择文件</VkButton>
        <span class="print-menu__file">{{ printDataName || '未选择' }}</span>
      </div>
      <div class="print-menu__row">
        <span class="print-menu__label">vkedit JSON</span>
        <VkButton size="sm" variant="outline" @click="selectVkeditFile">选择文件</VkButton>
        <span class="print-menu__file">{{ vkeditJsonName || '未选择（默认当前内容）' }}</span>
      </div>
      <div class="print-menu__row">
        <span class="print-menu__label">打印机地址</span>
        <VkInput
          :model-value="printerAddress"
          placeholder="可选，如 http://localhost:9120"
          @update:model-value="(value:any) => (printerAddress = String(value ?? ''))"
        />
      </div>
      <div class="print-menu__row">
        <span class="print-menu__label">打印机名称</span>
        <VkInput
          :model-value="printerName"
          placeholder="可选，如 HP LaserJet"
          @update:model-value="(value) => (printerName = String(value ?? ''))"
        />
      </div>
      <div class="print-menu__actions">
        <VkButton size="sm" data-dropdown-close @click="runPrint">开始打印</VkButton>
        <VkButton size="sm" variant="outline" data-dropdown-close @click="useExample">示例数据打印</VkButton>
      </div>
      <input
        ref="dataFileInput"
        type="file"
        accept=".json,application/json"
        class="print-menu__hidden-input"
        @change="onDataFileChange"
      />
      <input
        ref="vkeditFileInput"
        type="file"
        accept=".json,application/json"
        class="print-menu__hidden-input"
        @change="onVkeditFileChange"
      />
    </div>
  </VkDropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EditorHost } from '@/core/editor-host'
import VkDropdown from '@/components/ui/VkDropdown.vue'
import VkButton from '@/components/ui/VkButton.vue'
import VkInput from '@/components/ui/VkInput.vue'
import { printBusinessData, type PrintDataItem } from '@/index'
import { printData } from '../templates'

const props = defineProps<{ host: EditorHost }>()

const printerAddress = ref('')
const printerName = ref('')
const printDataItems = ref<PrintDataItem[]>([])
const printDataName = ref('')
const vkeditJson = ref('')
const vkeditJsonName = ref('')

const dataFileInput = ref<HTMLInputElement>()
const vkeditFileInput = ref<HTMLInputElement>()

function selectDataFile() {
  dataFileInput.value?.click()
}

function selectVkeditFile() {
  vkeditFileInput.value?.click()
}

function onDataFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result ?? ''))
      if (!Array.isArray(parsed)) {
        throw new Error('打印数据必须是数组')
      }
      printDataItems.value = parsed as PrintDataItem[]
      printDataName.value = file.name
    } catch (error) {
      window.alert(`打印数据 JSON 解析失败：${error instanceof Error ? error.message : String(error)}`)
    }
    input.value = ''
  }
  reader.onerror = () => {
    window.alert('读取打印数据 JSON 失败')
    input.value = ''
  }
  reader.readAsText(file)
}

function onVkeditFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const content = String(reader.result ?? '')
    try {
      JSON.parse(content)
      vkeditJson.value = content
      vkeditJsonName.value = file.name
    } catch (error) {
      window.alert(`vkedit JSON 解析失败：${error instanceof Error ? error.message : String(error)}`)
    }
    input.value = ''
  }
  reader.onerror = () => {
    window.alert('读取 vkedit JSON 失败')
    input.value = ''
  }
  reader.readAsText(file)
}

async function runPrint() {
  const data = printDataItems.value.length > 0 ? printDataItems.value : printData
  const json = vkeditJson.value || props.host.toJSON()
  if (!json) {
    window.alert('vkedit JSON 为空')
    return
  }

  try {
    await printBusinessData(
      data,
      json,
      printerAddress.value.trim() || undefined,
      undefined,
      printerName.value.trim() || undefined,
      'pdf'
    )
  } catch (error) {
    console.error(error)
    window.alert(`打印失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

function useExample() {
  printDataItems.value = printData
  printDataName.value = 'print-data.json（示例）'
  vkeditJson.value = ''
  vkeditJsonName.value = '当前编辑器内容'
  runPrint()
}
</script>

<style scoped>
.print-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 320px;
  padding: 8px;
}

.print-menu__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.print-menu__label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--vkedit-color-text-dark);
}

.print-menu__file {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--vkedit-color-text-dark-secondary);
}

.print-menu__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--vkedit-color-border, #333);
  padding-top: 8px;
}

.print-menu__hidden-input {
  display: none;
}
</style>

<template>
  <div class="vkedit-property__col-full vkedit-property__name-row">
    <VkLabel>名称</VkLabel>
    <VkInput
      ref="nameInputEl"
      :model-value="nameInput"
      :maxlength="50"
      placeholder="留空将使用自动命名"
      @update:model-value="(value: string | number) => (nameInput = String(value))"
      @keydown.enter.prevent="handleNameCommit"
      @blur="handleNameCommit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VkInput, VkLabel } from '@/components/ui'
import { usePropertyCommand } from '@/hooks'
import type { EditorHost } from '@/core'
import type { IGraphicElement } from '@/types'
import type { LayerManagerPlugin } from '@/plugins/layer-manager/layer-manager'

const props = defineProps<{
  host: EditorHost
  element: IGraphicElement
  selection?: IGraphicElement[]
}>()

const { batchUpdateProperty } = usePropertyCommand(props.host)

const layerPlugin = computed(
  () => props.host.getPlugin('layer-manager-plugin') as LayerManagerPlugin | undefined,
)

const displayName = computed(() => {
  const custom = props.element.displayName
  if (typeof custom === 'string' && custom.trim().length > 0) return custom
  return layerPlugin.value?.getElementDisplayName(props.element) ?? props.element.type
})

const nameInput = ref('')
const nameInputEl = ref<InstanceType<typeof VkInput> | null>(null)

watch(
  displayName,
  (val) => {
    const el = nameInputEl.value?.$el as HTMLInputElement | undefined
    if (el && document.activeElement === el) return
    nameInput.value = val
  },
  { immediate: true },
)

function handleNameCommit() {
  const raw = nameInput.value.trim()
  const next = raw.length === 0 ? null : raw.slice(0, 50)
  const targets = props.selection && props.selection.length > 0 ? props.selection : [props.element]
  if (props.element.displayName !== next) {
    batchUpdateProperty(targets, 'displayName', next)
  }
  nameInput.value = next ?? displayName.value
}
</script>

<style scoped>
.vkedit-property__name-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>

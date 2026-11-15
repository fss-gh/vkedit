<template>
  <div class="vkedit-dropdown" ref="dropdownRef">
    <div @click="toggle">
      <slot name="trigger" />
    </div>
    <Teleport to="body">
      <div
        v-if="open"
        class="vkedit-dropdown__overlay"
        :data-vkedit-theme="theme"
        @click="open = false"
      />
      <Transition name="vkedit-scale">
        <div
          v-if="open"
          ref="contentRef"
          class="vkedit-dropdown__content"
          :data-vkedit-theme="theme"
          :style="{ top: contentStyle.top, left: contentStyle.left }"
          @click="handleContentClick"
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, ref } from 'vue'
import { resolveVkeditTheme, type VkeditTheme } from '@/utils/theme'

const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const contentStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
const theme = ref<VkeditTheme>('dark')

function toggle() {
  open.value = !open.value
  if (open.value) {
    theme.value = resolveVkeditTheme(dropdownRef.value)
    updatePosition()
  }
}

async function updatePosition() {
  await nextTick()
  if (!dropdownRef.value) return
  const rect = dropdownRef.value.getBoundingClientRect()
  contentStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
}

function handleContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return

  // 点击输入类控件时保留菜单打开，方便填写内容
  if (target.closest('input, textarea, select, [contenteditable="true"]')) {
    return
  }

  // 点击菜单项/按钮后自动关闭菜单；文件选择等需要继续交互的按钮可以不添加 data-dropdown-close
  if (target.closest('.vkedit-dropdown__item, [data-dropdown-close]')) {
    open.value = false
  }
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  // 内容通过 Teleport 渲染在 body 下，不在 dropdownRef 内，需要同时判断 contentRef，
  // 否则点击菜单内部任何位置都会被当成“点击外部”而关闭。
  if (dropdownRef.value?.contains(target)) return
  if (contentRef.value?.contains(target)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped></style>

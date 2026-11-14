<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-rect :config="element.config" />
</template>

<script setup lang="ts">
import type { ShapeProps } from '@/types/shape-props'
import type { RectElement } from './rect'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Props extends ShapeProps<RectElement> {}

const { element } = defineProps<Props>()
</script>

<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-group :config="element.groupConfig">
    <v-rect :config="element.hitRectConfig" />
    <v-line :config="element.visibleLineConfig" />
  </v-group>
</template>

<script setup lang="ts">
import type { ShapeProps } from '@/types/shape-props'
import type { LineElement } from './line'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Props extends ShapeProps<LineElement> {}
const { element } = defineProps<Props>()
</script>

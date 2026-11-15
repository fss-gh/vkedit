<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-group :config="element.groupConfig">
    <v-ellipse :config="element.ellipseConfig" />
  </v-group>
</template>

<script setup lang="ts">
import type { ShapeProps } from '@/types/shape-props'
import type { EllipseElement } from './ellipse'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Props extends ShapeProps<EllipseElement> {}

const { element } = defineProps<Props>()
</script>

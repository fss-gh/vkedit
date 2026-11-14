<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-group :config="element.groupConfig">
    <v-rect :config="element.hitRectConfig" />
    <v-shape :config="element.curveShapeConfig" />
  </v-group>
</template>

<script setup lang="ts">
import type { ShapeProps } from '@/types/shape-props'
import type { CurveElement } from './curve'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Props extends ShapeProps<CurveElement> {}

const { element } = defineProps<Props>()
</script>

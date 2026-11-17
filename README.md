# vkedit

[![NPM Version](https://img.shields.io/npm/v/vkedit?style=flat-square)](https://www.npmjs.com/package/vkedit)
[![License](https://img.shields.io/npm/l/vkedit?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/node/v/vkedit?style=flat-square)](package.json)
[![在线示例](https://img.shields.io/badge/在线示例-vkedit.org-orange?style=flat-square)](https://vkedit.org)

基于 Vue 3 与 Konva.js 的可视化画布设计器组件，采用插件化架构，适用于标签、二维码、条码、票据、名片、证书等模板设计与打印排版场景。

**[English](README.en.md)** | **[在线示例](https://vkedit.org)** | **[文档](https://docs.vkedit.org)**

---

![项目预览](https://raw.githubusercontent.com/pwg-code/vkedit/main/截图/image.png?v=3)

---

## 特性

- **插件化架构** - 核心功能与图形元素均以插件形式注册，按需启用；`GraphicPlugin<T>` 抽象基类简化自定义插件开发
- **8 种图形元素** - 矩形、文本、线条、二维码、条形码、图片、曲线、椭圆/圆
- **圆/椭圆** - 支持正圆与椭圆，可配置填充色、边框色与边框粗细
- **矩形背景图片** - 支持 URL / data URL / 本地上传背景图，自动拉伸适配并支持清除
- **文本排版** - 字体固定为 Alibaba Sans（西文）+ Alibaba PuHuiTi（中文）（不可修改，内置字体资源，无需系统安装），支持加粗、对齐、字间距等设置；中文内容不允许使用斜体，JSON 导入导出后属性不丢失
- **二维码高级设置** - 支持纠错等级（L/M/Q/H）与中心图标（URL / data URL / 本地上传）
- **业务打印** - 通过 `printBusinessData()` 将打印数据按 `displayName` 绑定填充文本/二维码/条码，逐条生成 PDF，支持浏览器打印预览，也支持通过 PrintBridge 兼容接口静默 PDF 打印（`POST /api/print`）；支持宫格打印：将同一模板按行列排列到一页纸上，并可设置行数、列数、行间距、列间距、页边距
- **撤销/重做** - 基于命令模式，所有修改操作可逆
- **导入/导出** - JSON 序列化、PNG/JPG 图片、PDF 文档、SVG 矢量图
- **对齐与分布** - 左/右/上/下/居中对齐、水平/垂直均分
- **标尺与缩放** - 毫米级精度标尺、可配置 DPM（每毫米点数）
- **事件驱动** - 类型安全的事件系统，插件间松耦合通信
- **TypeScript** - 完整类型定义，泛型推断插件与元素类型
- **设计令牌系统** - 两层架构（Palette + Semantic），完整 CSS 变量覆盖 spacing、radius、font、shadow、elevation、z-index
- **主题系统** - 默认暗色主题，亮色主题通过 `data-vkedit-theme` 切换；Teleport 浮层主题继承；`resolveVkeditTheme()` 工具函数
- **VkButton 多变体** - primary、destructive、outline、secondary、ghost、link

---

## 安装

```bash
pnpm add vkedit vue konva vue-konva
```

vkedit 将 `vue`、`konva`、`vue-konva` 作为 peerDependencies，需由宿主项目提供。

| Peer Dependency | 版本    |
| --------------- | ------- |
| vue             | ^3.5.18 |
| konva           | ^10.0.2 |
| vue-konva       | ^3.2.6  |

Node.js 要求：`^20.19.0 || >=22.12.0`

---

## 快速上手

### 1. 配置入口文件

在 `main.ts` 中注册 VueKonva 并引入样式：

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import VueKonva from 'vue-konva'
import 'vkedit/dist/vkedit.css'

const app = createApp(App)
app.use(VueKonva)
app.mount('#app')
```

### 2. 使用编辑器组件

```vue
<template>
  <Vkedit :host="host" />
</template>

<script setup lang="ts">
import { createEditorHost, Vkedit } from 'vkedit'
import {
  RectPlugin,
  TextPlugin,
  QrcodePlugin,
  BarcodePlugin,
  LinePlugin,
  ImagePlugin,
  CurvePlugin,
  EllipsePlugin,
} from 'vkedit'

const host = createEditorHost()

// 安装图形插件
host
  .installPlugin('rect-plugin', RectPlugin)
  .installPlugin('text-plugin', TextPlugin)
  .installPlugin('qr-plugin', QrcodePlugin)
  .installPlugin('barcode-plugin', BarcodePlugin)
  .installPlugin('line-plugin', LinePlugin)
  .installPlugin('image-plugin', ImagePlugin)
  .installPlugin('curve-plugin', CurvePlugin)
  .installPlugin('ellipse-plugin', EllipsePlugin)

// 设置画布尺寸（A4 纸张，DPM = 8）
host.setStatus({
  dpm: 8,
  width: 210 * 8,
  height: 297 * 8,
  zoom: 0.4,
})
</script>
```

> 完整教程、API 文档与在线示例请访问 [docs.vkedit.org](https://docs.vkedit.org)。

---

## 主题与样式

vkedit 内置完整的设计令牌（Design Token）体系。暗色主题为默认值（`data-vkedit-theme="dark"`），引入 CSS 后即刻生效：

```ts
import 'vkedit/dist/vkedit.css'
```

覆盖品牌色（挂载在编辑器根或包裹容器上）：

```css
.vkedit-editor {
  --vkedit-color-primary: oklch(70% 0.14 185);
  --vkedit-color-primary-hover: oklch(78% 0.12 185);
  --vkedit-color-on-primary: oklch(14% 0 0);
}
```

令牌体系分两层：
- **Palette**（`:root`）— 颜色原始阶梯（neutral、teal、danger 等）以及非颜色尺度（spacing、radius、font、shadow、elevation、z-index）
- **Semantic**（主题选择器）— 引用 palette 的语义变量，分别定义 `data-vkedit-theme="dark"`（默认）与 `data-vkedit-theme="light"` 两套映射

完整变量列表与破坏性变更说明见 [MIGRATION.md](./MIGRATION.md)。

---

## PrintBridge 静默 PDF 打印

vkedit 通过 `printBusinessData()` 支持两种打印方式：

- **浏览器打印**：不传 `printerAddress`，生成 PDF 后弹出浏览器打印预览；
- **PrintBridge 静默打印**：传入 `printerAddress`，默认生成 PDF 后以 base64 形式静默发送到本地打印服务，由服务端直接调用打印机，不弹出打印对话框；也可以指定 `transport: 'svg'`，逐条把 SVG 以 base64 发送，由服务端渲染 PDF 后打印。

### 接口约定

PrintBridge 服务需实现以下接口：

```http
POST /api/print
Content-Type: application/json
```

请求体格式：

```json
{
  "pdf": "<base64-encoded PDF bytes>",
  "printer": "HP LaserJet",
  "copies": 1,
  "mediaWidth": 100,
  "mediaHeight": 50
}
```

字段说明：

- `pdf`：PDF 文件字节的 base64 编码，不包含 `data:application/pdf;base64,` 前缀；
- `printer`：打印机名称；为空字符串时由服务端选择默认打印机；
- `copies`：打印份数，当前固定为 `1`；
- `mediaWidth` / `mediaHeight`：纸张尺寸（毫米），默认取模板 `state.wmm` / `state.hmm`，缺失时根据像素尺寸与 DPM 换算；宫格打印时按格子尺寸与间距自动计算，或使用 `GridPrintOptions.pageWidthMM` / `pageHeightMM` 指定。

> 当使用 `transport: 'svg'` 时，`pdf` 字段为 **SVG 文件内容的 base64 编码**，由打印服务端解析并渲染成 PDF 后再打印。

### 使用示例

```ts
import { printBusinessData } from 'vkedit'

// 默认 pdf 传输：浏览器生成 PDF 后发送到打印服务
await printBusinessData(
  data,
  json,
  'http://localhost:9120', // 打印服务地址，也可直接填 http://localhost:9120/api/print
  undefined, // PDF 字体等导出选项，可选
  'HP LaserJet', // 打印机名称，可选
  'pdf', // 传输方式：'pdf'（默认）或 'svg'
)

// svg 传输：逐条把 SVG（base64）发送到打印服务，由服务端渲染 PDF 后打印
await printBusinessData(
  data,
  json,
  'http://localhost:9120',
  undefined,
  'HP LaserJet',
  'svg',
)
```

> SVG 模式下，发送前 `sendSvgToPrinter` 会按文本内容替换 `font-family`：中文使用 **`Alibaba PuHuiTi`**，西文使用 **`Alibaba Sans`**，同时保留原有的 `font-weight` / `font-style`，由服务端按字体变体渲染。`pdfOptions` 中的字体参数不再影响 SVG 传输模式。
>
> 如果服务端使用 `svg2pdf_py`（svglib），请先在服务端安装并注册 Alibaba PuHuiTi、Alibaba Sans 及其 **Bold/Italic 等变体**，否则加粗/斜体可能无法生效。

### 宫格打印

`printBusinessData()` 支持将同一个 vkedit JSON 模板按行列排列到一页纸上，每个格子填充一条打印数据，适合标签、名片、小票等批量打印场景。

```ts
import { printBusinessData } from 'vkedit'

await printBusinessData(
  data,            // 每条数据对应一个格子
  json,
  printerAddress,  // 为空则浏览器打印；非空则发送到 PrintBridge 接口
  undefined,
  printerName,     // 可选
  'pdf',           // 宫格打印仅支持 pdf 传输
  {
    rows: 3,
    cols: 2,
    rowGapMM: 2,
    colGapMM: 2,
    // marginMM: 5,              // 可选：四周统一页边距
    // marginLeftMM: 5,          // 可选：单独设置各方向页边距，覆盖 marginMM
    // marginRightMM: 5,
    // marginTopMM: 5,
    // marginBottomMM: 5,
    // pageWidthMM: 210,         // 可选，不传则按下方规则自动计算
    // pageHeightMM: 297,
  },
)
```

参数说明：

- `rows` / `cols`：每页行数、列数，至少为 1。
- `rowGapMM` / `colGapMM`：行间距、列间距，单位毫米，默认 0。
- `marginMM`：四周统一的页边距（毫米），默认 0。
- `marginLeftMM` / `marginRightMM` / `marginTopMM` / `marginBottomMM`：分别设置左、右、上、下页边距（毫米）；未设置时使用 `marginMM`，再未设置则为 0。
- `pageWidthMM` / `pageHeightMM`：可选整页纸张尺寸（毫米）。不传时默认按以下公式自动计算：
  - 页面宽 = `marginLeftMM + marginRightMM + cols * 模板宽 + (cols - 1) * colGapMM`
  - 页面高 = `marginTopMM + marginBottomMM + rows * 模板高 + (rows - 1) * rowGapMM`

规则：

- 数据条数超过 `rows * cols` 时，自动分多页 PDF。
- 宫格打印仅支持 `transport: 'pdf'`；如果传入 `grid` 且 `transport: 'svg'`，会抛出错误。
- 生成的 PDF 行为与普通打印一致：`printerAddress` 为空时浏览器打印，否则以 base64 发送到 PrintBridge 打印接口。

`printerAddress` 支持两种写法：

- `http://localhost:9120` → 自动请求 `http://localhost:9120/api/print`
- `http://localhost:9120/api/print` → 原样请求

---

## 链接

- [官网](https://vkedit.org)
- [文档](https://docs.vkedit.org)
- [npm](https://www.npmjs.com/package/vkedit)
- [GitHub Releases](https://github.com/pwg-code/vkedit/releases)
- [Vue.js](https://vuejs.org/)
- [Konva.js](https://konvajs.org/)
- [vue-konva](https://www.npmjs.com/package/vue-konva)

---

## License

[MIT](LICENSE)

---

## 社区

- [贡献指南](CONTRIBUTING.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [安全政策](SECURITY.md)
- [第三方许可证声明](THIRD_PARTY_LICENSES.md)

---

## 联系方式

- **QQ**: 16871824
- **邮箱**: 168715824@qq.com

提供技术支持、功能定制、项目合作。

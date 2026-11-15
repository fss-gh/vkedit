// 模板 JSON 需与当前库版本匹配，升级后需重新生成。
import businessCard from './business-card.json'
import shippingLabel from './shipping-label.json'
import priceTag from './price-tag.json'
import receipt from './receipt.json'
import certificate from './certificate.json'
import printDataJson from './print-data.json'

export const printData = printDataJson as Array<Record<string, string>>

export interface SceneTemplate {
  key: string
  name: string
  presetKey: string
  description: string
  data: { state: Record<string, unknown>; elements: Record<string, unknown>[] }
}

export const templates: SceneTemplate[] = [
  {
    key: 'business-card',
    name: '名片',
    presetKey: 'business-card',
    description: '姓名/职位/联系方式 + 二维码',
    data: businessCard as unknown as SceneTemplate['data'],
  },
  {
    key: 'shipping-label',
    name: '物流标签',
    presetKey: 'label',
    description: '收件信息 + 条形码运单号',
    data: shippingLabel as unknown as SceneTemplate['data'],
  },
  {
    key: 'price-tag',
    name: '价签',
    presetKey: 'label',
    description: '品名/大字号价格 + 二维码',
    data: priceTag as unknown as SceneTemplate['data'],
  },
  {
    key: 'receipt',
    name: '收据',
    presetKey: 'receipt',
    description: '表格明细 + 合计 + 条形码',
    data: receipt as unknown as SceneTemplate['data'],
  },
  {
    key: 'certificate',
    name: '合格证',
    presetKey: 'certificate',
    description: '动态数据、二维码、示例数据打印',
    data: certificate as unknown as SceneTemplate['data'],
  },
]

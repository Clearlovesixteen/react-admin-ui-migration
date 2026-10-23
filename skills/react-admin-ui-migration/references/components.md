# 新版组件与页面迁移

当前可核对基线为 base-element-react 3.0.0。版本数字用于识别基线，不代表后续版本自动兼容。以目标实际安装的导出、类型和实现为准；包未安装时先完成已授权的依赖升级，再验证 API。

## 初始化与职责

~~~tsx
import BaseElement from '@gancao-web/base-element-react';

BaseElement.use({
  request: {
    http: (url, data, config) => targetRequest(url, data, config),
    upload: targetUpload,
  },
  file: { host: targetFileHost },
  list: {
    layoutMode: 'grid',
    itemCol: 4,
    inset: true,
    itemBordered: true,
    colon: false,
    itemRight: 12,
    itemBottom: 14,
    padding: 0,
  },
  table: { operationAlign: 'left' },
});
~~~

这是 UI 配置示例。targetRequest/targetUpload/targetFileHost 必须接目标已有实现；HTTP 实参转换按目标封装决定，不能假设 requestApi 接收多个位置参数。

保留 pageKey、sizeKey、listKey、totalKey、rowKey 和 onShowRefresh 等原有协议及行为。pageinfo.total 只是某种后端响应路径，不是所有项目的标准。

BaseElement.use 不包含 layout。不要导入不存在的 PageLayout/NewMenu/RouteTabs，也不把业务 Layout 塞回组件库。

## 配置优先级与表单

配置为“内置值 < 全局值 < 实例值”，undefined 继续继承；false、0 和空字符串是有效覆盖。list.btnsConfig 按字段合并。

- form 影响所有 BaseForm，包括编辑弹窗。只调整搜索区时用 list 顶层字段。
- list 中的表单默认值只用于含真实 table 列的列表；table 未配置或为空数组的纯表单不继承列表外观和 fitViewport。
- 默认布局为 flow。**只写 itemCol: 3 或 inset: true 都不会开启 Grid。** 新版 Grid 必须显式配置 layoutMode: 'grid'，再决定 itemCol。
- 示例采用四列；目标可用三列或页面覆盖。列数是布局选择，不是业务要求。
- listForm 已删除；将其中的表单设置提升到 list 或页面的同层，不能移进影响所有弹窗的全局 form。
- Grid 跨列用 colSpan: 2 / 'full'；title/editor 默认整行。旧 sty.display: 'flex' 在 Grid 中仍会占满行，确认意图后再清理。
- inset 控制紧凑外观，itemBordered、colon、间距和列数独立配置。
- labelWidth 仍有实际意义：Grid 标签超过槽宽时单行省略，悬浮显示。不要批量删除 labelWidth 或必须的弹窗 paddingX。
- 动态 vif/disabled/libParam 等字段监听依赖配置函数中直接出现的字段名；抽成间接函数可能使旧联动失效。

日期组件使用 BaseDatePicker 或 comp: 'picker-date'，保留原日期类型、格式、区间边界、默认值、disabledDate 和时区语义。

## select-input

组合控件在表单配置中使用 prop 描述查询维度，field 放内部控件：

~~~tsx
{
  comp: 'select-input',
  selectLabelWidth: 120,
  prop: [
    { label: '创建时间', value: ['createdStart', 'createdEnd'] },
    { label: '更新时间', value: ['updatedStart', 'updatedEnd'] },
  ],
  value: [defaultRange],
  field: { comp: 'picker-date', type: 'datetimerange', clearable: false },
}
~~~

defaultRange 来自目标原默认值；value 是按维度索引保存的数组。单独使用 BaseSelectInput 组件时字段配置叫 lib；不要混淆组件 props 和 BaseForm item。

保留切换维度时的值清理、回车与自动查询、重置、缓存和最终 API 字段。需要转换参数时集中映射，并在请求前去掉仅用于 UI 的临时字段。

## 列表与表格

- scrollHeight 设置表体最大高度，少量数据自然收缩；fitViewport 才让列表填充可用高度。
- 开启 fitViewport 前先确认父级布局；不要把所有历史 scrollHeight 直接换成满高。
- cachePath 恢复查询条件，保留原存储 key 和精确路径匹配；首次查询回第一页，不宣称恢复排序与选择。
- crossPageSelection 要有稳定 rowKey；随机 rowKeyRandom: true 无法保持跨页选择。不要为了新样式改变原选择范围。
- 保留 onTableChange、sorter、disableSelection、行内开关和操作权限；新 UI 的按钮换行使用已确认的 btnWrap。
- 工具栏、列设置、顶部分类筛选是可选能力，不自动新增原系统没有的功能。

## 汇总区域

当前基线真实 hook 是 paginationLeftRender(response)，不是 paginationExtraRender。

~~~tsx
const config: BasePageConfig = {
  apiSearch: searchList,
  paginationLeftRender: (response) => renderSummary(response.summary),
};
return <BasePage config={config} />;
~~~

迁移前追踪“列表响应 -> 旧 apiSearch 副作用 -> state -> BasePage children”的数据链。仅当新 hook 获得等价数据时才删除旧 state/额外请求；children 中普通工具按钮、业务面板不自动移入汇总区域。

保留首次加载、搜索、重置、翻页、刷新、金额/百分比、标签、单位和空值语义。后端字段仍由目标 apiSearch 返回值决定，不套用示例 summary。

## 内容 Tabs

~~~tsx
<BaseTabs
  lib={[
    { label: '概览', value: 'overview', children: <Overview key="overview" /> },
    { label: '明细', value: 'detail', children: <Detail key="detail" /> },
  ]}
  value={active}
  onChange={setActive}
  destroyInactiveTabPane
/>
~~~

BaseTabs 使用 lib/value；lib 中的 children 在当前实现需为 ReactElement。原生 items/activeKey 也可能透传，但迁移时不要混用两套受控入口。fullHeight 需父级有可用高度。

保留默认激活页、URL、storage key、onChange 副作用、inactive 销毁或保活、child key/remount。原来保活时不能照抄上例的 destroyInactiveTabPane。

## 弹窗与旧页面

BasePage 通过 dialog 配置处理弹窗；标准表单优先 form + apiDetail + apiSubmit。保留 drawer、width、paddingX、校验、复制/只读分支，以及 submitReloadType 对应的新增重查与编辑刷新。

更早的 page/pageModal/service/Post 写法，需对照实际版本迁到 config/dialog/api.ts；这属于结构迁移，不在普通视觉升级中强制重命名所有模块。不要照搬某份旧参考里的无效初始化字段或请求函数签名。

本地组件目录清理前，全局检查独有扩展、样式、工具、类型、深层导入和使用方。标准组件迁入包入口，业务专属组件保留在目标项目合适位置。

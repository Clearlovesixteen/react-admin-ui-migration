# 新版组件与页面迁移

当前分发资源已核对 base-element-react 3.1.0 的已发布包、类型与组件 skill。版本数字用于识别基线，不代表后续版本自动兼容。先按 [版本查询与升级](version-upgrade.md) 查询目标 registry，选择兼容稳定版并完成必要安装和锁文件更新，再以实际加载的导出、类型和实现判断 API。已安装 3.x 也需要查询，不能用 skill 基线代替最新兼容版本。

## 如何判断合并后的组件

合并后的组件只有一套实现，视觉和布局由配置决定。包名、版本号或组件名称相同，不能证明目标项目已经采用新版 UI。

1. 追踪目标真实 import 与别名解析，确认加载的是本地组件目录还是锁文件对应的已安装包；同名本地旧实现不能当成新包。
2. 阅读该实现的公开导出、`typing`、`config.ts`、Form/List/Table defaults，以及组件包自带的 skill。目标包有差异时继续核对对应组件实现。
3. 阅读目标初始化和代表页面，区分内置默认值、项目全局值、页面覆盖和旧 CSS 补丁。记录每项的实际值、源码位置和处理理由，再修改。
4. 已符合新契约的页面保留；旧 API 先适配；业务专属扩展先迁移使用方。升级包后仍需检查页面配置和样式，不能将安装成功作为 UI 迁移完成。

样式加载与项目主题先按 [样式与运行时验收](styles-and-runtime.md) 核对；尤其注意 npm 包内的 Ant Design 引用不一定经过应用的按需样式转换。删除本地组件前还要检查隐式的 reset、颜色类和工具类。

本 Skill 分发的 `src/main.tsx` 推荐 UI 配置与组件内置值不同；这是迁移选择，不代表 master 或任意业务项目已经配置了这些值：

| 能力 | 组件内置行为 | Skill 分发的 UI 配置 |
| --- | --- | --- |
| 搜索布局 | flow，不指定统一列数 | grid，四列 |
| 搜索项 label | 默认右对齐 | 左对齐（`labelPosition: 'left'`） |
| 紧凑组合 / 表单项边框 | inset: false / itemBordered: false | 两者均为 true |
| 搜索项间距 | 右 40、下 24 | 右 12、下 14，padding: 0，colon: false |
| 列表满高 | fitViewport: false | true，必须具备可用的父级高度 |
| 搜索区默认收起 | defaultCollapsed: false | true，仍受展开/收起条件约束 |
| 工具栏按钮 | 默认右对齐 | 左对齐、default 类型；查询表单 footer 仍单独右对齐 |
| 表格操作列 | operationAlign: right | left |

这份表描述分发配置；目标项目的实际初始化必须单独阅读，不把业务分页协议、默认查询、缓存或按钮权限算作视觉默认值。后续版本发生变化时重新核对实现。

## 初始化与职责

将 UI 字段合并进目标已有初始化。下面的 existingConfig 表示已经读到的目标对象配置；原来使用配置函数时，在原函数返回对象中合并，保持运行时读取语义。

~~~tsx
import BaseElement from '@gancao-web/base-element-react';
import type { BaseGlobalProps } from '@gancao-web/base-element-react';

const migratedConfig: BaseGlobalProps = {
  ...existingConfig,
  list: {
    ...existingConfig.list,
    fitViewport: true,
    defaultCollapsed: true,
    layoutMode: 'grid',
    itemCol: 4,
    labelPosition: 'left',
    inset: true,
    itemBordered: true,
    colon: false,
    itemRight: 12,
    itemBottom: 14,
    padding: 0,
    btnsConfig: {
      ...existingConfig.list?.btnsConfig,
      align: 'left',
      type: 'default',
    },
  },
  table: { ...existingConfig.table, operationAlign: 'left' },
};

BaseElement.use(migratedConfig);
~~~

BaseElement.use 每次替换整份全局注册值，不是累积 patch。不要为了加入 UI 配置另调一次只含 list/table 的 use，导致 request、file、upload、modal 等既有配置丢失。组件解析时的默认值合并与这里的全局注册是不同步骤。

request/upload/file 保留目标实参协议；完整框架迁移将实现接到统一 SDK，仅迁 UI 时保留现有请求实现；HTTP 适配不能假设 requestApi 接收多个位置参数。保留 pageKey、sizeKey、listKey、totalKey、rowKey 和 onShowRefresh 等原有协议及行为。pageinfo.total 只是某种后端响应路径，不是所有项目的标准。

上述 fitViewport 基线在 Layout 到列表的高度、flex、min-height 和滚动责任确认后使用。自定义滚动、复杂嵌套 Tabs、非满高页面先逐页判断，可在页面配置 fitViewport: false。defaultCollapsed 也不会强制原本没有折叠条件的搜索区收起。

BaseElement.use 不包含 layout。PageLayout 由目标项目维护，不能从组件包导入不存在的 PageLayout/NewMenu/RouteTabs。

## 按页面形态决定配置

| 目标形态 | 迁移判断与配置位置 |
| --- | --- |
| 标准列表搜索区 | 采用已确认的全局 list 视觉；检查页面同名字段覆盖，字段用 colSpan 适配跨列 |
| 纯新增/编辑弹窗 | 不继承全局 list 搜索样式或 fitViewport；按原表单语义在实例配置，不将列表视觉放进全局 form |
| 混合列表、内容 Tabs、自定义表格 | 单独核对父级高度、激活值、销毁/保活、选择与滚动；仅在等价行为成立时启用相关能力 |
| 多维组合查询 | 核对 select-input 的 prop/field、默认值、切换与重置，保持最终接口字段 |
| 已符合合并后 API 的页面 | 保留有效配置；旧 labelWidth、paddingX、scrollHeight 和 CSS 补丁逐项确认后清理 |

## 配置优先级与表单

配置总体为“内置值 < 全局值 < 实例值”。列表搜索表单具体为“Form 内置值 < 全局 form < 全局 list 顶层表单字段 < 页面顶层表单字段”；全局 list 只在有真实表格列时参与。undefined 继续继承，false、0 和空字符串是有效覆盖；list.btnsConfig 按字段合并。

- form 影响所有 BaseForm，包括编辑弹窗。只调整搜索区时用 list 顶层字段。
- list 中的表单默认值只用于含真实 table 列的列表；table 未配置或为空数组的纯表单不继承列表外观和 fitViewport。
- 默认布局为 flow。**只写 itemCol: 3 或 inset: true 都不会开启 Grid。** 新版 Grid 必须显式配置 layoutMode: 'grid'，再决定 itemCol。
- 示例采用四列；目标可用三列或页面覆盖。列数是布局选择，不是业务要求。
- listForm 已删除；将其中的表单设置提升到 list 或页面的同层，不能移进影响所有弹窗的全局 form。
- Grid 跨列用 colSpan: 2 / 'full'；title/editor 默认整行。旧 sty.display: 'flex' 在 Grid 中仍会占满行，确认意图后再清理。
- `labelPosition: 'left'` 是当前迁移 UI 基线，只控制外层表单字段标签，不代表重置/查询操作组或 `select-input` 内部下拉标签自动左对齐；需要左对齐时显式核对 `.select-label` 的文本和选中值样式。不要用全局 CSS 覆盖 `.base-list-search` 或 `.base-list-search-footer` 的右对齐，除非产品明确要求。
- Grid 中的 `select-input` 包含内部维度标签和输入控件，不能按普通单字段估算宽度。文本、枚举和姓名类组合筛选默认保持单列；只有日期范围等确实需要更宽输入区的控件才配置 `colSpan: 2`。结合 `selectLabelWidth` 与 placeholder/日期范围的最小宽度选择跨度，并在四列、窄屏和重置后实际检查是否截断或挤压。
- BaseForm Grid 会按当前行剩余列数计算 `base-form-footer` 的跨度；不要在项目 CSS 中把它强制为 `grid-column: 1 / -1`，否则筛选项较少的页面会把重置/查询按钮推到下一行。
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

defaultRange 来自目标原默认值；value 是按维度索引保存的数组。单独使用 BaseSelectInput 组件时，维度选项用 lib；在 BaseForm item 中维度选项用 prop，内部控件仍用 field。不要混淆两层 API。

保留切换维度时的值清理、回车与自动查询、重置、缓存和最终 API 字段。需要转换参数时集中映射，并在请求前去掉仅用于 UI 的临时字段。

当旧页面把多个查询维度和日期范围展示为一个组合筛选项时，迁移后继续使用一个 `select-input`（`prop` 描述维度，`field` 承载 `picker-date`）；不要为了 Grid 排列拆成独立的“时间类型”与日期字段。拆分前必须证明旧接口和视觉行为都允许变化，并验证默认值、重置和最终 payload。

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

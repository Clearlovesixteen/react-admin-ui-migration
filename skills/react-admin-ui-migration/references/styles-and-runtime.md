# 样式、主题与浏览器验收

组件 API、Ant Design 基础 CSS、项目主题、页面布局是不同的迁移单元。组件安装成功和 Jest 组件测试通过，不能证明后三者已经生效。

## 先确认样式加载链路

读取实际安装包的入口、组件 import、Less/CSS、sideEffects，以及目标构建的样式处理范围。删除旧本地组件前，盘点它带来的全局 reset、颜色类、工具类和副作用样式；代码引用归零不能代替样式引用核对。

Ant Design 4 中：

- `antd/es/style/themes/default.less` 只提供 Less 变量，不能当作 Table/Cascader/Modal 的结构样式。
- base-element-react 3.0.0 自带组件扩展样式，内部直接从 `antd` 导入控件，没有替消费者载入完整 Ant Design 样式。
- Umi/Babel 的按需导入如果只转换应用源码，不会自动覆盖 node_modules 中这些间接引用。直接从应用导入过的 Input/Button 可能正常，封装中的 Table/Cascader 却完全失去样式。
- 浮层通常通过 portal 挂在 body 下；只给 PageLayout 局部包裹样式不能覆盖这些节点。需实际展开下拉、级联、弹窗、抽屉后验证。
- 纯表单弹窗还可能有组件内置 paddingX 或历史字段固定宽度；窄屏要验证正文宽度、标签排列和底部按钮，不能只让外层 Modal 缩小。保留页面级有效间距配置，并对已证实溢出的实例做响应式调整。

对确认缺少完整基础 CSS 的 Ant Design 4 项目，可在其全局样式入口载入：

~~~less
@import '~antd/dist/antd.less';
// 后面保留项目自己的覆盖。
~~~

波浪线仅在目标加载器支持时使用；Vite 等环境采用其实际支持的模块解析。保留 Less 变量主题时优先编译 antd.less，预编译 antd.css 不会采用 modifyVars。

完整样式和按需样式选择一种经验证的管线，避免重复注入导致体积及覆盖顺序不稳定。Umi 3 的 `@umijs/plugin-antd` 支持 `antd: { disableBabelPluginImport: true }`；确认本机插件版本支持且完整 Less 入口已接通后再使用。已有正确的按需管线可以保留，必须证明包内间接引用及浮层样式也已包含。Ant Design 5 不照搬这些 Less 设置。

扫描器的 `styleEntries` 区分完整样式、变量和组件样式；`entry-found-runtime-unverified` 只代表发现入口。按需/动态导入方案可能只有运行时才能确认，`needs-runtime-check` 不代表必须换构建工具。

## 主题属于分发资源

[Ant Design 4/Less 主题快照](../assets/theme/antd4.ts) 随包维护，内容为主题变量，没有业务接口、品牌图片、UnoCSS 或构建插件。需要落地参考新 UI 时，将其复制/合并到目标项目自己的主题文件，再接现有构建入口：Umi 用 theme，Vite 用 css.preprocessorOptions.less.modifyVars，Webpack 用现有 less-loader 的 lessOptions.modifyVars。保留既有业务颜色、品牌和特殊页面要求，不整份覆盖构建配置。

当前快照包含主色、灰阶、控件圆角以及 Modal/Drawer 的标题、内容和底部间距；不能只凭 BaseElement.use 或 PageLayout 模板宣称已应用同一视觉基线。组件扩展样式使用 `gray-500` 等变量，构建也应获得同一组值，不能仅用临时值消除报错。背景优先沿用目标已有资源；无背景图片时可用与主题匹配的浅色渐变，不引用维护者文件路径。

旧表格里可用的 `<span className={item.color}>` 不保证在新包生效。核对样式作用域；新包的文本颜色规则归属 BaseText 时，使用 `<BaseText color={item.color}>` 或对应的字段 color/lib API，保留原状态含义，不到全局补一批裸颜色类。

## 从实际结果发现布局问题

先在一个实际页面观察，再改同类页面：

- 表格本体应填满可用内容宽度；表头要有正常内边距，单元格与表头对齐。
- 满高表格常使用固定列布局。宽表须给关键文本、数字控件及操作列合理宽度；长内容使用已经确认的 ellipsis/换行 API，保留横向滚动与固定操作列，避免把列挤成逐字竖排。
- 检查行内 InputNumber 等实际宽度，父容器 80px 不会自动改变控件默认宽度；窄屏下操作与分页仍应可达。
- 四列搜索需在目标可用宽度验证。中等视口可减为两列，窄屏单列；避免只设置 itemCol 就把控件压成无法读完选项的宽度。
- 跨断点缩小时侧栏需按目标规则收起，保持业务 children 挂载；不能靠更换 Layout key 丢弃未保存状态。窄屏固定操作列可能遮住全部正文，可在该断点取消固定并保留横向访问；分页总数和选项应换行后仍可达。
- 空枚举不应访问 `arr[0]`，没有默认场景时继续保持原“不发列表请求”的契约。

不要用通用 `!important`、隐藏横向溢出或删列掩盖缺失样式。

## 建立能变红的反馈

浏览器可用且用户允许启动时，在修改前记录实际页面与症状，修改后复跑同一检查。除初始静态页面，还要展开浮层、翻页、滚动到宽表右端、打开编辑和只读场景，检查 Console 中真实异常。

随包的 [inspect-ui-styles.js](../scripts/inspect-ui-styles.js) 是可在浏览器只读 evaluate/控制台执行的完整表达式，返回已挂载表格、级联、数字框、分页、Modal/Drawer 的结构样式检查。不发请求、不改 DOM 或状态；not-mounted 必须在打开相应控件后重新检查。它不能替代截图、主题比对、搜索/重置/分页等交互，也不证明业务保存已验。

Jest 的样式 mock 和 jsdom 不会运行真实 Less 管线。回归应落在真实 Less 编译、构建 CSS 或真实浏览器 seam，检查结构声明/计算样式和尺寸；仅断言源码出现 import、匹配说明文字或组件能渲染，挡不住此次失效。

无账号、服务不可达或禁止浏览器时，继续可独立完成的代码/构建检查，明确剩余验收范围。用户已经要求实际浏览器验收时，不能只把验收清单留给用户就结束；只有确实无法解除的访问阻碍才交代具体阻碍。

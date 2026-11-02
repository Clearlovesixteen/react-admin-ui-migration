# 请求、登录、权限与环境

## 目标绑定

逐环境对照旧配置，绑定应用 ID、品牌、SSO/退出、GAPI/UC/Java、文件 host、官网链接、路由模式、权限和缓存开关。浏览器环境以统一 env 模块暴露；VITE_ 变量会进入前端产物，不能存放私有凭据。

Vite 的 MODE、PROD 与业务环境不同：build --mode test 也可能 PROD=true。迁移文章官网/预览链接等分支前记录旧行为，使用显式业务环境或 URL，不机械替换 NODE_ENV。pre 未提供独立主机时核对是否走生产服务及灰度标记，不能悄悄切到测试。

## 请求适配

框架基线的 requestApi 接收单个配置对象：

~~~ts
requestApi({ url, data, ...config })
~~~

实际顺序是：无 url 走 requestGapi；有 url 且 API_MODE=gapis 走 requestHyperf；其余有 url 走 Java。Java 项目中的无 url GAPI 调用仍保持原分支。不要改写成“所有 Java 模式请求都走 Java”。

- package/class、filter、pageinfo.page/pagesize、零值/空值、响应 list/total 和业务错误语义属于项目合同，SDK 不负责自动改成目标分页。
- 成功/失效码与解包先对照旧实现和已安装 SDK。基线 SDK 处理 GAPI 的 00000 / 800 / 10015，以及 Java/UC 的 1 / -10；其他项目码须明确适配。
- 统一 SDK 链可保留临时薄门面，但门面不能继续执行第二套旧加密/HTTP 客户端。旧入口删除前全局核对调用闭包。
- SDK 的 requestUc 只有在 data 为对象时才注入 sysId。没有业务参数也传 data:{}；不能仅设置 sysId 就宣称所有调用已带应用身份。
- token、gapi_token、sso_token/uc-token 分别核对；在 header/data 回调中实时读取 Store，不在模块导入时捕获用户。
- 公共 OSS 历史正文等匿名 fetch 保持独立、无身份 header；不能把统一请求强加到所有网络读取。
- 日志只传白名单字段，不能迁入完整用户 Store、授权 code、token、header 或完整敏感正文。资源提供日志适配边界，目标已有实际接收端要接回。

## 登录与状态

资源提供 GAPI 和 Java 响应适配；实际字段以目标接口为准，不能按文档猜测。Java 是否另换 GAPI token 由项目明确配置，CMS 的 GAPI 试点不能证明另一项目的 Java 登录已联调。

登录 code 兑换覆盖 mid:null，避免全局旧身份混入。成功后清除 code，恢复本应用原 path/query/hash；拒绝外站、协议相对地址和反斜杠形式的 from。

Store 以 name_APP_ID 隔离。切换旧 key 可选择一次重新登录或校验后的迁移，需明确记录。普通版本切换可留旧 key 供回退；显式退出/过期必须清除兼容期身份，不能回退读取旧用户，更不能 localStorage.clear 清空其他应用数据。

用户补充信息、批量配置和其他启动职责核对实际消费者后保留。Store 的 set 应以当前完整状态合并，取消订阅不能清掉同 key 的其他组件。

## 权限与菜单

- 保留原权限 code、parentCode、type、sysId、path；显式 code 优先，不能用模板生成的 menu 序号覆盖已分配角色。
- getUserMenu 的树与 getUserPerm 的平铺列表是不同合同。资源支持树或平铺归一化，但端点由 VITE_APP_PERMISSION_URL 绑定。按钮权限若来自独立接口，要接回，不把树中没出现当成全部按钮拒绝。
- 角色过滤关闭时直接 ready，不请求或等待远程权限；登录仍必需。开启时覆盖失败、重试、拒绝和换号慢响应隔离。
- 原服务端名称/排序仅作为展示元数据合并，本地 path、层级、code 和加载器保持可信声明；菜单、快捷搜索和直达 URL 的父子授权一致。
- 权限上传页可能在进入时就 POST 更新后台。只用 mock 校验自动同步及 payload；访问真实同步页不能作为只读浏览器验收。
- /_AuthUpload 等旧平台 URL 保留兼容或明确重定向。原关闭业务路由继续关闭，迁移源码不等于开放入口。

## 上传与平台

标准上传接进度/取消及 {url}；Braft 等专属调用接同一边界，不保留旧上传 HTTP 链。GAPI 的 name 可为 OSS 对象名，拼接目标文件 host；绝对 URL 不重复拼接，Java 直传尊重签名返回地址。主图的粘贴能力不改变正文长图模式的输入限制。

我的应用和文件中心是完整框架的接入项。应用列表走目标 UC；文件中心核对 appId、status、pageNum/pageSize、keyword/fileName 和下载 URL。错格式进入错误/重试，不把失败或未接接口转换成成功空数组。

页签、KeepAlive、query/state 与刷新语义单独核对。旧系统无缓存时可以具备能力但保持关闭；不能因模板默认开启就改变未保存表单生命周期。

# 应用版本更新提示

完整框架资源包含构建版本清单、检查链和项目 Header 提示。来源为 admin-template/master 的版本能力，维护版适配了 ESM、相对 base 与项目布局边界。仅迁 UI 时不新增该交互；已有发布策略时逐项复用，不能建立两条轮询链或提高最低版本阈值。

## 接入链

- 目标 package.json 的 `version` 是当前应用版本，`minVersion` 是最低可继续使用版本，均为安全整数的 x.y.z，且 minVersion <= version。沿用目标发布号；新应用按团队发布规则初始化。不要抄 master 的 2.8.4，也不要使用本插件 1.2.0 或组件版本。
- Vite 注册 `plugins/appVersion.mjs` 的 `appVersionPlugin(env.VITE_APP_ENV)`。插件按 Vite 实际 root 读取 package.json，仅在 build 时校验并产出 `version.json`，内容为 env/version/minVersion；test/pre/production 各自绑定明确环境。
- `virtual:app-version` 导出当前版本、环境和清单 URL。URL 使用构建器发出的资源引用，跟随实际输出位置及 base；不要用 origin 拼接 `./version.json`，那会在子目录部署时请求站点根目录。开发模式提供空 URL，组件不发检查请求。
- 将 `src/components/VersionUpdate` 接在项目 `PageLayout/index.tsx` 的 headerActions 中，保留文件中心、我的应用和主题按钮。通用展示 Shell 不导入 Router、env、package.json 或 VersionUpdate；只复制 page-layout 展示资源不自动获得版本功能。
- `src/common/appVersion.js/.d.ts` 提供版本校验，`src/version-update.d.ts` 声明虚拟模块。插件、公共模块、声明和视图一起合入，不能只复制一个组件。

## 运行语义

生产构建进入应用即检查，之后每 60 秒检查；页面隐藏时跳过，恢复可见或上线时重试；单实例不并发，10 秒超时中止，卸载清理定时器、监听与请求。请求带 no-store 和时间戳；无效 JSON、错误环境、旧版本、网络失败不影响当前页面，也不覆盖已知的新版本。

发现更新但当前版本达到 minVersion 时，Header 展示“更新”，由用户打开确认框。低于最低版本时显示不可关闭的更新框。两者都由用户点击“立即更新”后刷新，并提示未保存内容会丢失；不自动刷新、不清理登录或业务缓存。

## 部署与验证

HTML、JS/CSS 和 version.json 同次发布。版本文件不走 SPA fallback、不长期缓存；静态资源 CDN 跨域时确认版本文件可读。旧哈希资源在发布切换时保留到既有页面退出，最低版本提示不能补救已经删除的懒加载块。

验证合法/非法版本和环境、开发跳过、可选/强制提示、隐藏/恢复、断网/超时与卸载；分别核对根部署、子目录 hash 路由，以及目标使用的 history/base/CDN 组合。构建产物中的清单 URL 必须指向同一应用部署目录，不拼到业务路由后。资源测试与隔离构建不代表目标生产发布或真实浏览器 UI 已验收。

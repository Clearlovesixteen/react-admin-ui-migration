# 维护规则

- 本仓库维护 UI 迁移 Skill 和分发资源，不是后台运行应用。
- 运行工具使用 Node 内置模块；不要引入消费者后台的依赖或执行它的业务代码。
- 调整技能规则先核对对应组件的实际源码/类型；PageLayout 保留为目标项目代码，不回填组件包。
- assets 是可分发快照；通过 scripts/sync-baseline.mjs 从明确的组件维护仓库同步，同时审查业务隔离与基线变更。
- resources/menu-visual 是已核对 WMS 的菜单视觉源：本地图形、独立配色和来源指纹。由同一同步脚本生成到 PageLayout 分发目录，不修改快照后遗漏生成源，也不引入源系统 iconfont CDN。
- 脚本不自动执行消费者安装钩子，不改用户全局配置，不创建外部仓库或发布包。
- 版本通过 scripts/version.mjs 同步；交付前执行 npm run lint、npm test、npm pack --dry-run。
- 测试关注扫描覆盖、失败诊断、无副作用、离线资源闭包和真实打包内容，不做文本措辞快照。

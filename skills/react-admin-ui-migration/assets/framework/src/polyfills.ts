// 保留旧浏览器的 Object.hasOwn 兼容；Node 升级不能替代浏览器运行时能力。
if (typeof Object.hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    configurable: true,
    writable: true,
    value: (target: object, key: PropertyKey) =>
      Object.prototype.hasOwnProperty.call(target, key),
  });
}

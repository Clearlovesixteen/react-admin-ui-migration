/** 版本只接受三段安全的非负整数；不把预发布版或任意字符串当作发布版本。 */
export function isVersion(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
    && value.split('.').every((part) => Number.isSafeInteger(Number(part)));
}

export function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

export function isAppVersion(value) {
  return value !== null && typeof value === 'object'
    && typeof value.env === 'string' && value.env.trim().length > 0
    && isVersion(value.version) && isVersion(value.minVersion)
    && compareVersions(value.minVersion, value.version) <= 0;
}

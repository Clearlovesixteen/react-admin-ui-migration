import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isAppVersion } from '../src/common/appVersion.js';

const virtualId = 'virtual:app-version';
const resolvedId = '\0' + virtualId;

/** 使用构建器的资源引用生成 URL，兼容 ESM、相对 base 和子目录部署。 */
export function appVersionPlugin(env) {
  let root;
  let building = false;
  let reference;
  let manifest;
  return {
    name: 'app-version',
    configResolved(config) {
      root = config.root;
      building = config.command === 'build';
    },
    buildStart() {
      if (!building) return;
      const { version, minVersion } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
      manifest = { env, version, minVersion };
      if (!isAppVersion(manifest)) {
        throw new Error('版本配置无效：需要非空 VITE_APP_ENV、x.y.z 格式的 version/minVersion，且 minVersion <= version');
      }
      reference = this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(manifest) });
    },
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      if (!building) return 'export const manifestUrl = null; export const currentVersion = ""; export const currentEnv = "";';
      if (!reference) throw new Error('版本资源尚未生成');
      return `export const manifestUrl = import.meta.ROLLUP_FILE_URL_${reference};\n`
        + `export const currentVersion = ${JSON.stringify(manifest.version)};\n`
        + `export const currentEnv = ${JSON.stringify(manifest.env)};\n`;
    },
  };
}

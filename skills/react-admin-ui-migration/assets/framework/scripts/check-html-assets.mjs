import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * - 检查 HTML 中的 href/src 资源是否存在，如果不存在则抛出错误
 * - 作为 pnpm run lint 的一项检查
 */

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = ['index.html'];
const assetAttributePattern = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/giu;
const externalUrlPattern = /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/iu;

const errors = [];

for (const relativeHtmlPath of htmlFiles) {
  const htmlPath = resolve(projectRoot, relativeHtmlPath);
  const html = readFileSync(htmlPath, 'utf8').replace(/<!--[^]*?-->/gu, '');

  for (const match of html.matchAll(assetAttributePattern)) {
    const assetUrl = match[2].trim();

    if (!assetUrl || externalUrlPattern.test(assetUrl) || /%[A-Z][A-Z\d_]*%/u.test(assetUrl)) {
      continue;
    }

    const line = html.slice(0, match.index).split('\n').length;
    let pathname;

    try {
      pathname = decodeURIComponent(assetUrl.split(/[?#]/u, 1)[0]);
    } catch {
      errors.push(`${relativeHtmlPath}:${line} 本地静态资源路径编码无效 ${assetUrl}`);
      continue;
    }

    const candidates = pathname.startsWith('/')
      ? [resolve(projectRoot, `.${pathname}`), resolve(projectRoot, 'public', `.${pathname}`)]
      : [resolve(dirname(htmlPath), pathname)];

    if (candidates.some(existsSync)) {
      continue;
    }

    errors.push(`${relativeHtmlPath}:${line} 找不到本地静态资源 ${assetUrl}`);
  }
}

if (errors.length > 0) {
  console.error(['HTML 静态资源检查失败：', ...errors.map((error) => `- ${error}`)].join('\n'));
  process.exitCode = 1;
}

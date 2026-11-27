import type { AppVersion } from '../../common/appVersion.js';
export function watchAppVersion(options: {
  url: string | null;
  currentVersion: string;
  env: string;
  onUpdate: (version: AppVersion) => void;
  enabled?: boolean;
}): () => void;

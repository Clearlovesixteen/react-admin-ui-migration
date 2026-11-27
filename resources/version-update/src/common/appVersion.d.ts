export type AppVersion = { env: string; version: string; minVersion: string };
export function isVersion(value: unknown): value is string;
/** 调用前须用 isVersion 校验外部输入。 */
export function compareVersions(left: string, right: string): number;
export function isAppVersion(value: unknown): value is AppVersion;

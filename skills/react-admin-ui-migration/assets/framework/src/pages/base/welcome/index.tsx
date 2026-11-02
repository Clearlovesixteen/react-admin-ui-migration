import { env } from '@/common/env';
export default function Welcome() { return <section style={{ padding: 24 }}>欢迎使用{env.VITE_APP_NAME}</section>; }

import { rm } from 'node:fs/promises';

const bundledApk = new URL('../dist/downloads/Chatimall.apk', import.meta.url);
await rm(bundledApk, { force: true });

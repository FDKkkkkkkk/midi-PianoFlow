import { defineConfig } from 'vite';
//import { alphaTab } from '@coderline/alphatab-vite';

export default defineConfig({
  base: '/midi-PianoFlow/',  // 相对路径
  build: {
    outDir: 'docs'  // 打包到 docs 文件夹
  }
});
// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
// import sourcemaps from 'rollup-plugin-sourcemaps';
export default {
  input: './libs/rx-basic-store/src/index.ts',

  // eslint-disable-next-line no-dupe-keys
  output: {
    file: './dist/libs/rx-basic-store/index.js',
    sourcemap: true,
    name: 'rx-basic-store',
    format: 'umd'
  },
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './libs/rx-basic-store/tsconfig.lib.prod.json',
    }),
    copy({
      targets: [{ src: ['./libs/rx-basic-store/package.json', './libs/rx-basic-store/README.md'], dest: './dist/libs/rx-basic-store' }],
    }),
    // sourcemaps()
  ],
};

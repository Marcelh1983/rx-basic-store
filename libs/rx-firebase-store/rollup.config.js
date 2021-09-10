// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
// import sourcemaps from 'rollup-plugin-sourcemaps';
export default {
  input: './libs/rx-firebase-store/src/index.ts',

  // eslint-disable-next-line no-dupe-keys
  output: {
    file: './dist/libs/rx-firebase-store/index.js',
    sourcemap: true,
    
  },
  plugins: [
    typescript({
      tsconfig: './libs/rx-firebase-store/tsconfig.lib.prod.json',
    }),
    copy({
      targets: [{ src: ['./libs/rx-firebase-store/package.json', './libs/rx-firebase-store/README.md'], dest: './dist/libs/rx-firebase-store' }],
    }),
    // sourcemaps()
  ],
};

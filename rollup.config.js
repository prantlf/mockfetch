import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { minify } from 'rollup-plugin-swc-minify'
import cleanup from 'rollup-plugin-cleanup'

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        sourcemap: true
      },
      {
        file: 'dist/index.min.js',
        sourcemap: true,
        plugins: [minify()]
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'mockfetch',
        sourcemap: true
      },
      {
        file: 'dist/index.umd.min.js',
        format: 'umd',
        name: 'mockfetch',
        sourcemap: true,
        plugins: [minify()]
      }
    ],
    plugins: [nodeResolve(), typescript(), cleanup({ comments: 'none', extensions: ['ts'] })]
  }
]

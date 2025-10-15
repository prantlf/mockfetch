import { minify } from 'rollup-plugin-swc-minify'

export default [
  {
    input: 'lib/index.js',
    output: [
      {
        file: 'lib/index.cjs',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'lib/index.min.js',
        sourcemap: true,
        plugins: [minify()]
      },
      {
        file: 'lib/index.umd.js',
        format: 'umd',
        name: 'mockfetch',
        sourcemap: true
      },
      {
        file: 'lib/index.umd.min.js',
        format: 'umd',
        name: 'mockfetch',
        sourcemap: true,
        plugins: [minify()]
      }
    ]
  }
]

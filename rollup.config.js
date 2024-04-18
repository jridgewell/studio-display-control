import typescript from '@rollup/plugin-typescript';

function configure(esm) {
  return {
    input: 'src/studio-display-control.ts',
    output: esm
      ? {
          format: 'es',
          dir: 'dist',
          entryFileNames: '[name].mjs',
          sourcemap: true,
          exports: 'named',
        }
      : {
          format: 'cjs',
          dir: 'dist',
          entryFileNames: '[name].cjs',
          sourcemap: true,
          exports: 'named',
        },
    plugins: [
      typescript({
        tsconfig: './tsconfig.build.json',
        tslib: './throw-when-needed',
      }),
    ],
    watch: {
      include: 'src/**',
    },
  };
}

export default [configure(false), configure(true)];

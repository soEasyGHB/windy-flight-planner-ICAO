// Adapted from windycom/windy-plugin-template v5.0.1. See README for source.
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import rollupSvelte from 'rollup-plugin-svelte';
import rollupSwc from 'rollup-plugin-swc3';
import rollupCleanup from 'rollup-plugin-cleanup';
import { less } from 'svelte-preprocess-less';
import sveltePreprocess from 'svelte-preprocess';
import { transformCodeToESMPlugin, keyPEM, certificatePEM } from '@windycom/plugin-devtools';

export default {
  input: 'src/plugin.svelte',
  output: [
    { file: 'dist/plugin.js', format: 'module', sourcemap: true },
    { file: 'dist/plugin.min.js', format: 'module', plugins: [rollupCleanup({ comments:'none', extensions:['ts'] }),terser()] }
  ],
  onwarn: warning => {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    console.warn(warning.message);
  },
  external: id => id.startsWith('@windy/'),
  watch: {include:['src/**'],exclude:'node_modules/**',clearScreen:false},
  plugins: [
    rollupSvelte({emitCss:false,preprocess:{
      style:less({sourceMap:false,math:'always'}),
      script:data=>sveltePreprocess({sourceMap:true}).script(data)
    }}),
    rollupSwc({include:['**/*.ts','**/*.svelte'],sourceMaps:true}),
    resolve({browser:true,mainFields:['module','jsnext:main','main'],preferBuiltins:false,dedupe:['svelte']}),
    commonjs(),transformCodeToESMPlugin(),
    process.env.SERVE!=='false' && serve({
      contentBase:'dist',host:'0.0.0.0',port:9999,headers:{'Access-Control-Allow-Origin':'*'},
      https:{key:keyPEM,cert:certificatePEM}
    })
  ]
};

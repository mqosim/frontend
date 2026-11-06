/**
 * Ambient declaration for single-file components.
 *
 * `vue-tsc` teaches TypeScript about `.vue` files by monkey-patching
 * `fs.readFileSync` and re-requiring `typescript/lib/tsc`. That hook does not
 * fire under the Bun runtime (Bun's module loader bypasses `fs.readFileSync`),
 * so under `bun run typecheck` the file is compiled by a plain `tsc` that cannot
 * resolve `.vue` imports and reports TS2307 for every one of them.
 *
 * This shim keeps `.vue` imports resolving in the editor and under Bun. When the
 * same command runs under Node, `vue-tsc` resolves the real SFCs (and typechecks
 * their templates/props); this declaration only remains a fallback for any
 * `.vue` that has no real resolution.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent
  export default component
}

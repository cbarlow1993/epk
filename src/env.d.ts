/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@editorjs/embed' {
  import type { BlockToolConstructable } from '@editorjs/editorjs'
  const Embed: BlockToolConstructable
  export default Embed
}

declare module '@editorjs/attaches' {
  import type { BlockToolConstructable } from '@editorjs/editorjs'
  const AttachesTool: BlockToolConstructable
  export default AttachesTool
}

declare module '@calumk/editorjs-columns' {
  const EditorJsColumns: unknown
  export default EditorJsColumns
}

declare module '@editorjs/nested-list' {
  import type { BlockToolConstructable } from '@editorjs/editorjs'
  const NestedList: BlockToolConstructable
  export default NestedList
}

declare module '@editorjs/text-variant-tune' {
  const TextVariantTune: unknown
  export default TextVariantTune
}

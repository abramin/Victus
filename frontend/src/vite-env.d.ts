/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_3D_AVATAR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

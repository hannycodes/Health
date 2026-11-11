/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DATA_SOURCE?: "mock" | "http";
  /** Maximum size, in MB, of an image attached to an AI Assistant message. */
  readonly VITE_AI_IMAGE_MAX_MB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Public programmatic entrypoint. Re-export config helpers so users can do:
//   import { defineConfig } from '@mariokreitz/langsync';
export {
  defineConfig,
  type LangSyncConfig,
  type LangSyncConfigInput,
} from '@langsync/shared/config';

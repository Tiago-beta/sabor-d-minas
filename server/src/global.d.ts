// Fallback declaration in case Node types aren't loaded for some reason.
// This should normally be provided by @types/node.
// The minimal shape prevents TS2580 build errors in constrained envs.
// If for some reason @types/node isn't loaded, provide a minimal fallback so
// tsc doesn't error on 'process'. At runtime real Node global will exist.
// This is intentionally partial.
interface __MinimalProcessEnv { [k: string]: string | undefined }
interface __MinimalProcess { env: __MinimalProcessEnv; exit(code?: number): void }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: __MinimalProcess;

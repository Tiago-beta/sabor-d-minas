// Fallback declaration in case Node types aren't loaded for some reason.
// This should normally be provided by @types/node.
// The minimal shape prevents TS2580 build errors in constrained envs.
declare const process: import('node:process').Process;

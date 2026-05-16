// Stub for the `server-only` Next.js package.
//
// In a Next.js build, `import 'server-only'` throws at compile time when the
// importing module is bundled into a client chunk. Outside Next.js (plain
// Node, Vitest) the package doesn't exist at all. This stub makes it a
// silent no-op so server-action modules can be imported in integration tests.
export {};

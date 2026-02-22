/**
 * Stub type declarations for packages whose type files are absent in this
 * npm install. These stubs preserve type-safety for the packages that DO
 * have types, while allowing tsc to complete without errors for the ones
 * that are missing their .d.ts files.
 *
 * Remove individual stubs when the real package types become available.
 */

// ---------------------------------------------------------------------------
// NodeJS.Process augmentation – @types/node in this install omits env/Process.
// Ensures process.env is typed throughout the codebase.
// ---------------------------------------------------------------------------
declare namespace NodeJS {
  interface Process {
    env: ProcessEnv;
  }
  interface ProcessEnv {
    readonly NODE_ENV?: "development" | "production" | "test";
    [key: string]: string | undefined;
  }
}

// ---------------------------------------------------------------------------
// better-auth/react – React hooks for better-auth
// ---------------------------------------------------------------------------
declare module "better-auth/react" {
  // biome-ignore lint/suspicious/noExplicitAny: stub for missing package types
  export function createAuthClient(options?: Record<string, any>): any;
  // biome-ignore lint/suspicious/noExplicitAny: stub for missing package types
  export function useSession(): any;
  // biome-ignore lint/suspicious/noExplicitAny: stub for missing package types
  export function signIn(options?: Record<string, any>): Promise<any>;
  // biome-ignore lint/suspicious/noExplicitAny: stub for missing package types
  export function signOut(options?: Record<string, any>): Promise<any>;
  // biome-ignore lint/suspicious/noExplicitAny: stub for missing package types
  export function signUp(options?: Record<string, any>): Promise<any>;
}

// ---------------------------------------------------------------------------
// @trpc/react-query – tRPC React Query adapter
// ---------------------------------------------------------------------------
declare module "@trpc/react-query" {
  // biome-ignore lint/suspicious/noExplicitAny: stub for missing package types
  export function createTRPCReact<T = any>(): any;
  // biome-ignore lint/suspicious/noExplicitAny: stub for missing package types
  export type inferReactQueryProcedureOptions<T> = any;
}

// ---------------------------------------------------------------------------
// tailwind-merge – utility for merging Tailwind CSS class names
// ---------------------------------------------------------------------------
declare module "tailwind-merge" {
  export type ClassNameValue = string | null | undefined | boolean | ClassNameValue[];
  export function twMerge(...inputs: ClassNameValue[]): string;
  export function extendTailwindMerge(config: object): typeof twMerge;
}

// ---------------------------------------------------------------------------
// node:path – @types/node path.d.ts is empty in this install.
// Explicitly declares the named exports used by this codebase.
// ---------------------------------------------------------------------------
declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
  export function normalize(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function relative(from: string, to: string): string;
  export const sep: string;
  export const delimiter: string;
}

// ---------------------------------------------------------------------------
// node:fs – @types/node fs.d.ts declarations for sync file reading used in tests.
// ---------------------------------------------------------------------------
declare module "node:fs" {
  export function readFileSync(path: string, encoding: BufferEncoding): string;
  export function readFileSync(
    path: string,
    options: { encoding: BufferEncoding; flag?: string },
  ): string;
  export function readFileSync(path: string): Buffer;
  export function existsSync(path: string): boolean;
  export function writeFileSync(
    path: string,
    data: string | Buffer,
    options?: { encoding?: BufferEncoding; flag?: string },
  ): void;
}

// ---------------------------------------------------------------------------
// node:fs/promises – async file operations
// ---------------------------------------------------------------------------
declare module "node:fs/promises" {
  export function readFile(path: string, encoding: BufferEncoding): Promise<string>;
  export function writeFile(path: string, data: string | Buffer): Promise<void>;
  export function access(path: string, mode?: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// node:url – URL utilities
// ---------------------------------------------------------------------------
declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
  export function pathToFileURL(path: string): URL;
  export class URL {
    constructor(input: string, base?: string | URL);
    href: string;
    origin: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
  }
}

// ---------------------------------------------------------------------------
// node:os – OS utilities
// ---------------------------------------------------------------------------
declare module "node:os" {
  export function tmpdir(): string;
  export function homedir(): string;
  export function platform(): string;
  export function arch(): string;
}

// ---------------------------------------------------------------------------
// node:child_process – child process utilities
// ---------------------------------------------------------------------------
declare module "node:child_process" {
  export interface SpawnOptions {
    cwd?: string;
    env?: Record<string, string>;
    stdio?: "pipe" | "inherit" | "ignore";
  }
  export interface ChildProcess {
    pid?: number;
    stdout: unknown;
    stderr: unknown;
    stdin: unknown;
    on(event: string, listener: (...args: unknown[]) => void): this;
    kill(signal?: string): boolean;
  }
  export function spawn(command: string, args?: string[], options?: SpawnOptions): ChildProcess;
  export function execSync(
    command: string,
    options?: { encoding?: BufferEncoding; cwd?: string },
  ): string | Buffer;
}

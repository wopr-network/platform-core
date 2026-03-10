/**
 * Better Auth — Platform auth source of truth.
 *
 * Provides email+password auth, session management, and cookie-based auth
 * for the platform UI. Uses PostgreSQL via pg.Pool for persistence.
 *
 * The auth instance is lazily initialized to avoid opening the database
 * at module import time (which breaks tests).
 */

import { type BetterAuthOptions, betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import type { Pool } from "pg";
import type { PlatformDb } from "../db/index.js";
import { RoleStore } from "../admin/role-store.js";
import { logger } from "../config/logger.js";
import { initTwoFactorSchema } from "../db/auth-user-repository.js";
import { getEmailClient } from "../email/client.js";
import { passwordResetEmailTemplate, verifyEmailTemplate } from "../email/templates.js";
import { generateVerificationToken, initVerificationSchema, PgEmailVerifier } from "../email/verification.js";
import { createUserCreator, type IUserCreator } from "./user-creator.js";

/** Configuration for initializing Better Auth in platform-core. */
export interface BetterAuthConfig {
  pool: Pool;
  db: PlatformDb;
  /** Called after a new user signs up (e.g., create personal tenant). */
  onUserCreated?: (userId: string, userName: string, email: string) => Promise<void>;
}

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "";
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3100";

let _config: BetterAuthConfig | null = null;
let _userCreator: IUserCreator | null = null;
let _userCreatorPromise: Promise<IUserCreator> | null = null;

async function getUserCreator(): Promise<IUserCreator> {
  if (_userCreator) return _userCreator;
  if (!_userCreatorPromise) {
    if (!_config) throw new Error("BetterAuth not initialized — call initBetterAuth() first");
    _userCreatorPromise = createUserCreator(new RoleStore(_config.db)).then((creator) => {
      _userCreator = creator;
      return creator;
    });
  }
  return _userCreatorPromise;
}

function authOptions(pool: Pool): BetterAuthOptions {
  return {
    database: pool,
    secret: BETTER_AUTH_SECRET,
    baseURL: BETTER_AUTH_URL,
    basePath: "/api/auth",
    socialProviders: {
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } }
        : {}),
      ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
        ? { discord: { clientId: process.env.DISCORD_CLIENT_ID, clientSecret: process.env.DISCORD_CLIENT_SECRET } }
        : {}),
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
        : {}),
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["github", "google"],
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => {
        try {
          const emailClient = getEmailClient();
          const template = passwordResetEmailTemplate(url, user.email);
          await emailClient.send({
            to: user.email,
            ...template,
            userId: user.id,
            templateName: "password-reset",
          });
        } catch (error) {
          logger.error("Failed to send password reset email:", error);
        }
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              const userCreator = await getUserCreator();
              await userCreator.createUser(user.id);
            } catch (error) {
              logger.error("Failed to run user creator:", error);
            }

            if (user.emailVerified) return;

            try {
              await initVerificationSchema(pool);
              const { token } = await generateVerificationToken(pool, user.id);
              const verifyUrl = `${BETTER_AUTH_URL}/auth/verify?token=${token}`;
              const emailClient = getEmailClient();
              const template = verifyEmailTemplate(verifyUrl, user.email);
              await emailClient.send({
                to: user.email,
                ...template,
                userId: user.id,
                templateName: "verify-email",
              });
            } catch (error) {
              logger.error("Failed to send verification email:", error);
            }

            // Delegate personal tenant creation to the consumer
            if (_config?.onUserCreated) {
              try {
                await _config.onUserCreated(user.id, user.name || user.email, user.email);
              } catch (error) {
                logger.error("Failed to run onUserCreated callback:", error);
              }
            }
          },
        },
      },
    },
    session: {
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      cookiePrefix: "better-auth",
      cookies: {
        session_token: {
          attributes: {
            domain: process.env.COOKIE_DOMAIN || ".wopr.bot",
          },
        },
      },
    },
    plugins: [twoFactor()],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 900, max: 5 },
        "/sign-up/email": { window: 3600, max: 10 },
        "/request-password-reset": { window: 3600, max: 3 },
      },
      storage: "memory",
    },
    trustedOrigins: (process.env.UI_ORIGIN || "http://localhost:3001").split(","),
  };
}

/** The type of a better-auth instance. */
export type Auth = ReturnType<typeof betterAuth>;

/** Initialize Better Auth with the given config. Must be called before getAuth(). */
export function initBetterAuth(config: BetterAuthConfig): void {
  _config = config;
}

/**
 * Run better-auth migrations against the auth database.
 * Must be called after initBetterAuth().
 */
export async function runAuthMigrations(): Promise<void> {
  if (!_config) throw new Error("BetterAuth not initialized — call initBetterAuth() first");
  type DbModule = { getMigrations: (opts: BetterAuthOptions) => Promise<{ runMigrations: () => Promise<void> }> };
  const { getMigrations } = (await import("better-auth/db")) as unknown as DbModule;
  const { runMigrations } = await getMigrations(authOptions(_config.pool));
  await runMigrations();
  await initTwoFactorSchema(_config.pool);
}

let _auth: Auth | null = null;

/**
 * Get or create the singleton better-auth instance.
 * Lazily initialized on first call. initBetterAuth() must be called first.
 */
export function getAuth(): Auth {
  if (!_auth) {
    if (!_config) throw new Error("BetterAuth not initialized — call initBetterAuth() first");
    _auth = betterAuth(authOptions(_config.pool));
  }
  return _auth;
}

/** Get an IEmailVerifier backed by the auth database. */
export function getEmailVerifier(): PgEmailVerifier {
  if (!_config) throw new Error("BetterAuth not initialized — call initBetterAuth() first");
  return new PgEmailVerifier(_config.pool);
}

/** Replace the singleton auth instance (for testing). */
export function setAuth(auth: Auth): void {
  _auth = auth;
}

/** Reset the singleton (for testing cleanup). */
export function resetAuth(): void {
  _auth = null;
}

/** Reset the user creator singleton (for testing). */
export function resetUserCreator(): void {
  _userCreator = null;
  _userCreatorPromise = null;
}

export type { EncryptedPayload, Provider, ValidateKeyRequest, ValidateKeyResponse, WriteSecretsRequest, ProviderEndpoint } from "./types.js";
export { providerSchema, validateKeyRequestSchema, writeSecretsRequestSchema } from "./types.js";
export { deriveInstanceKey, generateInstanceKey, encrypt, decrypt } from "./encryption.js";
export { validateNodeHost } from "./host-validation.js";
export { assertSafeRedirectUrl } from "./redirect-allowlist.js";
export type { KeyLeakMatch } from "./key-audit.js";
export { scanForKeyLeaks } from "./key-audit.js";
export { writeEncryptedSeed, forwardSecretsToInstance } from "./key-injection.js";
export { PROVIDER_ENDPOINTS, validateProviderKey } from "./key-validation.js";

// Credential vault
export {
  type CredentialRow,
  type CredentialSummaryRow,
  type ICredentialMigrationAccess,
  type ICredentialRepository,
  type IMigrationTenantKeyAccess,
  DrizzleCredentialRepository,
  DrizzleMigrationTenantKeyAccess,
  type RotationResult,
  reEncryptAllCredentials,
  type MigrationResult,
  migratePlaintextCredentials,
  type PlaintextFinding,
  auditCredentialEncryption,
  type AuthType,
  type CreateCredentialInput,
  type CredentialSummary,
  type DecryptedCredential,
  type ICredentialVaultStore,
  type RotateCredentialInput,
  CredentialVaultStore,
  getVaultEncryptionKey,
} from "./credential-vault/index.js";

// Tenant keys
export {
  type IKeyResolutionRepository,
  DrizzleKeyResolutionRepository,
  type ResolvedKey,
  resolveApiKey,
  buildPooledKeysMap,
  type TenantApiKey,
  type ITenantKeyRepository,
  TenantKeyRepository,
  type CapabilityName,
  type TenantCapabilitySetting,
  type ICapabilitySettingsRepository,
  ALL_CAPABILITIES,
  CapabilitySettingsStore,
  type IOrgMembershipRepository,
  type OrgResolvedKey,
  DrizzleOrgMembershipRepository,
  resolveApiKeyWithOrgFallback,
} from "./tenant-keys/index.js";

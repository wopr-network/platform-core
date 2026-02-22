import type { Organization, OrgMember } from "./api";
import { trpcVanilla } from "./trpc";

// ---- Typed org client stub ----
// AppRouter is a placeholder until @wopr-network/sdk publishes the full types.
// We define the shape we need here to avoid raw fetch boilerplate while keeping
// the call sites type-checked against our own interface declarations.

interface OrgProcedures {
  getOrganization: { query(input?: Record<never, never>): Promise<Organization> };
  updateOrganization: {
    mutate(input: Partial<Pick<Organization, "name" | "billingEmail">>): Promise<Organization>;
  };
  inviteMember: { mutate(input: { email: string; role: string }): Promise<OrgMember> };
  removeMember: { mutate(input: { memberId: string }): Promise<void> };
  transferOwnership: { mutate(input: { memberId: string }): Promise<void> };
}

// Cast via unknown to avoid @typescript/no-explicit-any while bridging the
// placeholder AppRouter gap. Remove once @wopr-network/sdk ships real types.
const orgClient = (trpcVanilla as unknown as { org: OrgProcedures }).org;

// ---- API calls ----

export async function getOrganization(): Promise<Organization> {
  return orgClient.getOrganization.query();
}

export async function updateOrganization(
  data: Partial<Pick<Organization, "name" | "billingEmail">>,
): Promise<Organization> {
  return orgClient.updateOrganization.mutate(data);
}

export async function inviteMember(email: string, role: string): Promise<OrgMember> {
  return orgClient.inviteMember.mutate({ email, role });
}

export async function removeMember(memberId: string): Promise<void> {
  await orgClient.removeMember.mutate({ memberId });
}

export async function transferOwnership(memberId: string): Promise<void> {
  await orgClient.transferOwnership.mutate({ memberId });
}

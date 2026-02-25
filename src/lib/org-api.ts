import type { Organization, OrgInvite } from "./api";
import { trpcVanilla } from "./trpc";

// ---- Typed org client stub ----
// AppRouter is a placeholder until @wopr-network/sdk publishes the full types.
// We define the shape we need here to avoid raw fetch boilerplate while keeping
// the call sites type-checked against our own interface declarations.

interface OrgInviteRow {
  id: string;
  orgId: string;
  email: string;
  role: "admin" | "member";
  invitedBy: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

interface OrgProcedures {
  getOrganization: {
    query(input?: Record<never, never>): Promise<Organization>;
  };
  updateOrganization: {
    mutate(input: {
      orgId: string;
      name?: string;
      slug?: string;
      billingEmail?: string;
    }): Promise<Organization>;
  };
  inviteMember: {
    mutate(input: {
      orgId: string;
      email: string;
      role: "admin" | "member";
    }): Promise<OrgInviteRow>;
  };
  revokeInvite: {
    mutate(input: { orgId: string; inviteId: string }): Promise<{ revoked: boolean }>;
  };
  changeRole: {
    mutate(input: {
      orgId: string;
      userId: string;
      role: "admin" | "member";
    }): Promise<{ updated: boolean }>;
  };
  removeMember: {
    mutate(input: { orgId: string; userId: string }): Promise<{ removed: boolean }>;
  };
  transferOwnership: {
    mutate(input: { orgId: string; userId: string }): Promise<{ transferred: boolean }>;
  };
  deleteOrganization: {
    mutate(input: { orgId: string }): Promise<{ deleted: boolean }>;
  };
  createOrganization: {
    mutate(input: {
      name: string;
      slug?: string;
    }): Promise<{ id: string; name: string; slug: string }>;
  };
}

// Cast via unknown to avoid @typescript/no-explicit-any while bridging the
// placeholder AppRouter gap. Remove once @wopr-network/sdk ships real types.
const orgClient = (trpcVanilla as unknown as { org: OrgProcedures }).org;

// ---- API calls ----

export async function getOrganization(): Promise<Organization> {
  return orgClient.getOrganization.query();
}

export async function updateOrganization(
  orgId: string,
  data: { name?: string; slug?: string; billingEmail?: string },
): Promise<Organization> {
  return orgClient.updateOrganization.mutate({ orgId, ...data });
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: "admin" | "member",
): Promise<OrgInvite> {
  const row = await orgClient.inviteMember.mutate({ orgId, email, role });
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    invitedBy: row.invitedBy,
    expiresAt: new Date(row.expiresAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function revokeInvite(orgId: string, inviteId: string): Promise<void> {
  await orgClient.revokeInvite.mutate({ orgId, inviteId });
}

export async function changeRole(
  orgId: string,
  userId: string,
  role: "admin" | "member",
): Promise<void> {
  await orgClient.changeRole.mutate({ orgId, userId, role });
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await orgClient.removeMember.mutate({ orgId, userId });
}

export async function transferOwnership(orgId: string, userId: string): Promise<void> {
  await orgClient.transferOwnership.mutate({ orgId, userId });
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await orgClient.deleteOrganization.mutate({ orgId });
}

export async function createOrganization(data: {
  name: string;
  slug?: string;
}): Promise<{ id: string; name: string; slug: string }> {
  return orgClient.createOrganization.mutate(data);
}

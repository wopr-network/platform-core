export const PAGE_PROMPTS: Record<string, string> = {
  "/dashboard":
    "You are on the user's dashboard. They can see their bot instances, setup checklist, and command center. Help them manage their bots or complete setup steps.",
  "/marketplace":
    "You are on the plugin marketplace. The user is browsing plugins they can install on their WOPR bots. Help them find plugins, explain what plugins do, and guide installation.",
  "/settings/account":
    "You are on the account settings page. The user can change their password and manage billing. Help with account management tasks.",
  "/billing/usage":
    "You are on the billing usage page. The user can see their credit consumption and API usage. Help them understand their usage and optimize costs.",
  "/instances":
    "You are on the bot instances page. The user can see all their WOPR bot instances, create new ones, and manage existing ones. Help with instance management.",
};

export function getPagePrompt(pathname: string): string | null {
  if (PAGE_PROMPTS[pathname]) return PAGE_PROMPTS[pathname];
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    const prefix = `/${segments.join("/")}`;
    if (PAGE_PROMPTS[prefix]) return PAGE_PROMPTS[prefix];
    segments.pop();
  }
  return null;
}

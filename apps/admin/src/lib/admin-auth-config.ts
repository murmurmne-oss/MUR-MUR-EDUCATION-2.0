export const ADMIN_COOKIE_NAME = "admin_session";

export type AdminAuthMode = "credentials" | "id" | "code";

type AdminCredentialsConfig = {
  username: string;
  password: string;
};

export type AdminAuthConfig = {
  sessionSecret: string;
  credentials: AdminCredentialsConfig | null;
  allowedIds: string[];
  accessCode: string | null;
};

function parseList(raw?: string | null) {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function loadAdminAuthConfig(): AdminAuthConfig | null {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!sessionSecret) {
    return null;
  }

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const credentials =
    username && password.length > 0 ? { username, password } : null;

  const allowedIds = parseList(process.env.ADMIN_ALLOWED_IDS);
  const accessCode = process.env.ADMIN_ACCESS_TOKEN?.trim() ?? null;

  if (!credentials && allowedIds.length === 0 && !accessCode) {
    return null;
  }

  return {
    sessionSecret,
    credentials,
    allowedIds,
    accessCode,
  };
}

export function getEnabledAuthModes(
  config: AdminAuthConfig | null,
): AdminAuthMode[] {
  if (!config) {
    return [];
  }

  const modes: AdminAuthMode[] = [];

  if (config.credentials) {
    modes.push("credentials");
  }

  if (config.allowedIds.length > 0) {
    modes.push("id");
  }

  if (config.accessCode) {
    modes.push("code");
  }

  return modes;
}

export function isAdminAuthMode(value: unknown): value is AdminAuthMode {
  return value === "credentials" || value === "id" || value === "code";
}

async function hashPayload(payload: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(
  mode: AdminAuthMode,
  identifier: string,
  secret: string,
) {
  return hashPayload(`${mode}:${identifier}:${secret}`);
}

export async function buildAllowedSessionTokens(config: AdminAuthConfig) {
  const tasks: Promise<string>[] = [];

  if (config.credentials) {
    tasks.push(
      createSessionToken(
        "credentials",
        config.credentials.username,
        config.sessionSecret,
      ),
    );
  }

  for (const id of config.allowedIds) {
    tasks.push(createSessionToken("id", id, config.sessionSecret));
  }

  if (config.accessCode) {
    tasks.push(
      createSessionToken("code", config.accessCode, config.sessionSecret),
    );
  }

  return Promise.all(tasks);
}



/**
 * Stalwart Mail Server API Integration
 *
 * This library provides functions to communicate with Stalwart Mail Server
 * for mailbox management, email sending, and DKIM configuration.
 *
 * Server: mail.surfsyncinfotech.xyz
 * API Port: 8080 (default JMAP/HTTP API)
 */

type StalwartConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  useHttps: boolean;
};

export type StalwartMailbox = {
  id: string;
  email: string;
  name: string;
  quota: number;
  used: number;
};

export type StalwartUser = {
  id: string;
  email: string;
  name: string;
  description?: string;
};

export type StalwartResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get Stalwart configuration from environment variables
 */
export function getStalwartConfig(): StalwartConfig | null {
  const host = process.env.STALWART_HOST || "mail.surfsyncinfotech.xyz";
  const port = Number(process.env.STALWART_PORT || 8080);
  const username = process.env.STALWART_ADMIN_USERNAME || "admin";
  const password = process.env.STALWART_ADMIN_PASSWORD || "";
  const useHttps = process.env.STALWART_USE_HTTPS === "true";

  if (!password) {
    console.warn("Stalwart is not configured: STALWART_ADMIN_PASSWORD not set");
    return null;
  }

  return { host, port, username, password, useHttps };
}

/**
 * Check if Stalwart is configured and accessible
 */
export function stalwartConfigured(): boolean {
  return getStalwartConfig() !== null;
}

/**
 * Build API URL for Stalwart
 */
function buildApiUrl(path: string): string {
  const config = getStalwartConfig();
  if (!config) throw new Error("Stalwart not configured");

  const protocol = config.useHttps ? "https" : "http";
  return `${protocol}://${config.host}:${config.port}${path}`;
}

/**
 * Make authenticated request to Stalwart API
 */
async function stalwartRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<StalwartResponse<T>> {
  const config = getStalwartConfig();
  if (!config) {
    return { success: false, error: "Stalwart not configured" };
  }

  try {
    const url = buildApiUrl(path);
    const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Stalwart API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Stalwart error",
    };
  }
}

/**
 * Create a mailbox in Stalwart
 */
export async function createStalwartMailbox(
  email: string,
  password: string,
  name?: string,
): Promise<StalwartResponse<{ id: string }>> {
  if (!stalwartConfigured()) {
    return { success: false, error: "Stalwart not configured" };
  }

  return stalwartRequest<{ id: string }>("POST", "/api/v1/mailboxes", {
    email,
    password,
    name: name || email.split("@")[0],
  });
}

/**
 * Delete a mailbox from Stalwart
 */
export async function deleteStalwartMailbox(email: string): Promise<StalwartResponse> {
  if (!stalwartConfigured()) {
    return { success: false, error: "Stalwart not configured" };
  }

  return stalwartRequest("DELETE", `/api/v1/mailboxes/${encodeURIComponent(email)}`);
}

/**
 * Update mailbox password in Stalwart
 */
export async function updateStalwartPassword(
  email: string,
  newPassword: string,
): Promise<StalwartResponse> {
  if (!stalwartConfigured()) {
    return { success: false, error: "Stalwart not configured" };
  }

  return stalwartRequest("PUT", `/api/v1/mailboxes/${encodeURIComponent(email)}`, {
    password: newPassword,
  });
}

/**
 * Get mailbox info from Stalwart
 */
export async function getStalwartMailbox(email: string): Promise<StalwartResponse<StalwartMailbox>> {
  if (!stalwartConfigured()) {
    return { success: false, error: "Stalwart not configured" };
  }

  return stalwartRequest<StalwartMailbox>("GET", `/api/v1/mailboxes/${encodeURIComponent(email)}`);
}

/**
 * Configure DKIM for a domain in Stalwart
 */
export async function configureStalwartDKIM(
  domain: string,
  selector: string,
  privateKey: string,
): Promise<StalwartResponse> {
  if (!stalwartConfigured()) {
    return { success: false, error: "Stalwart not configured" };
  }

  return stalwartRequest("POST", "/api/v1/dkim", {
    domain,
    selector,
    private_key: privateKey,
  });
}

/**
 * Test Stalwart connection
 */
export async function testStalwartConnection(): Promise<StalwartResponse<{ status: string }>> {
  if (!stalwartConfigured()) {
    return { success: false, error: "Stalwart not configured" };
  }

  return stalwartRequest<{ status: string }>("GET", "/api/v1/status");
}

const PAYPAL_API = process.env.PAYPAL_API_BASE_URL || "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("PayPal no está configurado.");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "No se pudo autenticar con PayPal.");
  return data.access_token;
}

export async function paypalRequest(path: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.details?.[0]?.description || "PayPal rechazó la solicitud.");
  return data;
}

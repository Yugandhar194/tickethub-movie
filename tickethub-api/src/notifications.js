const DEFAULT_GRAPH_VERSION = 'v24.0';

function normalizeWhatsAppRecipient(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const recipient = digits.length === 10 ? `91${digits}` : digits;
  return /^\d{10,15}$/.test(recipient) ? recipient : null;
}

/**
 * Sends an approved WhatsApp Cloud API template.
 * Returns a delivery result; provider failures are non-fatal to an already-paid booking.
 */
export async function sendWhatsAppTemplate({
  token,
  phoneNumberId,
  template,
  graphVersion = DEFAULT_GRAPH_VERSION,
  phone,
  parameters,
  fetchImpl = fetch,
}) {
  if (!token || !phoneNumberId || !template) {
    return { sent: false, skipped: true, reason: 'WhatsApp is not configured.' };
  }

  const to = normalizeWhatsAppRecipient(phone);
  if (!to) {
    return { sent: false, skipped: true, reason: 'Customer phone number is missing or invalid.' };
  }

  if (!Array.isArray(parameters) || parameters.length !== 5) {
    throw new TypeError('The TicketHub booking template requires exactly five body parameters.');
  }

  const version = String(graphVersion || DEFAULT_GRAPH_VERSION).replace(/^v?/, 'v');
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: 'en_US' },
        components: [{
          type: 'body',
          parameters: parameters.map((text) => ({ type: 'text', text: String(text) })),
        }],
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `WhatsApp API request failed (HTTP ${response.status}).`);
    error.status = response.status;
    error.providerCode = data?.error?.code;
    throw error;
  }

  return {
    sent: true,
    messageId: data?.messages?.[0]?.id || null,
    recipient: data?.contacts?.[0]?.wa_id || to,
  };
}

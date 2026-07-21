import crypto from "crypto";

const PAYFAST_HOST = process.env.PAYFAST_URL;

interface PayfastFields {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  m_payment_id: string;
  amount: string; // e.g. "199.00"
  item_name: string;
  email_address?: string;
  [key: string]: string | undefined;
}

function generateSignature(
  fields: Record<string, string | undefined>,
  passphrase?: string,
) {
  // Order matters: use insertion order of `fields`, PayFast does NOT want alphabetical sort
  let pairs = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        v && `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, "+")}`,
    );

  let paramString = pairs.join("&");
  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }

  return crypto.createHash("md5").update(paramString).digest("hex");
}

export function buildPayfastPayment(fields: PayfastFields) {
  const passphrase = process.env.PAYFAST_PASSPHRASE || undefined;
  const signature = generateSignature(fields, passphrase);

  return {
    actionUrl: `${PAYFAST_HOST}/eng/process`,
    fields: { ...fields, signature },
  };
}

export function validatePayfastSignature(
  postedFields: Record<string, string>,
  passphrase?: string,
) {
  const { signature, ...rest } = postedFields;
  const expected = generateSignature(rest, passphrase);
  return expected === signature;
}

const TOSS_API_BASE = "https://api.tosspayments.com/v1";
const BILLING_AMOUNT = Number(Deno.env.get("TOSS_BILLING_AMOUNT") ?? "9900");
const BILLING_ORDER_NAME = Deno.env.get("TOSS_BILLING_ORDER_NAME") ?? "AntGravity Pro 월정액";

export interface TossChargeInput {
  billingKey: string;
  customerKey: string;
  amount?: number;
  orderId: string;
  orderName?: string;
  customerEmail?: string | null;
  customerName?: string | null;
}

export function getBillingAmount() {
  return BILLING_AMOUNT;
}

export function getBillingOrderName() {
  return BILLING_ORDER_NAME;
}

export function getBasicAuthToken(secretKey: string) {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

export async function issueBillingKey(params: {
  secretKey: string;
  authKey: string;
  customerKey: string;
}) {
  const response = await fetch(
    `${TOSS_API_BASE}/billing/authorizations/${params.authKey}`,
    {
      method: "POST",
      headers: {
        Authorization: getBasicAuthToken(params.secretKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerKey: params.customerKey }),
    },
  );

  const data = await response.json();
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function chargeBillingKey(params: {
  secretKey: string;
  input: TossChargeInput;
}) {
  const response = await fetch(
    `${TOSS_API_BASE}/billing/${params.input.billingKey}`,
    {
      method: "POST",
      headers: {
        Authorization: getBasicAuthToken(params.secretKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey: params.input.customerKey,
        amount: params.input.amount ?? BILLING_AMOUNT,
        orderId: params.input.orderId,
        orderName: params.input.orderName ?? BILLING_ORDER_NAME,
        customerEmail: params.input.customerEmail ?? undefined,
        customerName: params.input.customerName ?? undefined,
      }),
    },
  );

  const data = await response.json();
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function addOneMonth(base: Date) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export function toKstDateString(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isDueOnOrBeforeTargetDate(
  currentPeriodEnd: string | null,
  targetDate: string,
) {
  if (!currentPeriodEnd) return false;
  return toKstDateString(currentPeriodEnd) <= targetDate;
}

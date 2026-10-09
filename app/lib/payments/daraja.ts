import "server-only";
import { Buffer } from "node:buffer";

type DarajaEnvironment = "sandbox" | "production";

interface DarajaConfig {
  environment: DarajaEnvironment;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  transactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  callbackUrl: string;
}

interface DarajaB2CConfig {
  initiatorName: string;
  securityCredential: string;
  resultUrl: string;
  timeoutUrl: string;
}

interface DarajaReversalConfig {
  resultUrl: string;
  timeoutUrl: string;
  receiverIdentifierType: string;
}

interface DarajaResponse {
  ResponseCode?: string;
  ResponseDescription?: string;
  errorMessage?: string;
  access_token?: string;
  expires_in?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ConversationID?: string;
  OriginatorConversationID?: string;
  CustomerMessage?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  [key: string]: unknown;
}

export class DarajaApiError extends Error {
  constructor(
    message: string,
    readonly requestMayHaveSucceeded: boolean,
  ) {
    super(message);
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getDarajaConfig(): DarajaConfig {
  const environment = requiredEnv("DARAJA_ENVIRONMENT");
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("DARAJA_ENVIRONMENT must be sandbox or production");
  }

  const callbackUrl = new URL(requiredEnv("DARAJA_STK_CALLBACK_URL"));
  if (callbackUrl.protocol !== "https:") {
    throw new Error("DARAJA_STK_CALLBACK_URL must use HTTPS");
  }

  const transactionType =
    process.env.DARAJA_STK_TRANSACTION_TYPE?.trim() ||
    "CustomerPayBillOnline";
  if (
    transactionType !== "CustomerPayBillOnline" &&
    transactionType !== "CustomerBuyGoodsOnline"
  ) {
    throw new Error("DARAJA_STK_TRANSACTION_TYPE is invalid");
  }

  return {
    environment,
    consumerKey: requiredEnv("DARAJA_CONSUMER_KEY"),
    consumerSecret: requiredEnv("DARAJA_CONSUMER_SECRET"),
    shortcode: requiredEnv("DARAJA_SHORTCODE"),
    passkey: requiredEnv("DARAJA_STK_PASSKEY"),
    transactionType,
    callbackUrl: callbackUrl.toString(),
  };
}

function getDarajaB2CConfig(): DarajaB2CConfig {
  const resultUrl = new URL(requiredEnv("DARAJA_B2C_RESULT_URL"));
  const timeoutUrl = new URL(requiredEnv("DARAJA_B2C_TIMEOUT_URL"));
  if (resultUrl.protocol !== "https:" || timeoutUrl.protocol !== "https:") {
    throw new Error("Daraja B2C callback URLs must use HTTPS");
  }
  return {
    initiatorName: requiredEnv("DARAJA_B2C_INITIATOR_NAME"),
    securityCredential: requiredEnv("DARAJA_B2C_SECURITY_CREDENTIAL"),
    resultUrl: resultUrl.toString(),
    timeoutUrl: timeoutUrl.toString(),
  };
}

function getDarajaReversalConfig(): DarajaReversalConfig {
  const resultUrl = new URL(requiredEnv("DARAJA_REVERSAL_RESULT_URL"));
  const timeoutUrl = new URL(requiredEnv("DARAJA_REVERSAL_TIMEOUT_URL"));
  if (resultUrl.protocol !== "https:" || timeoutUrl.protocol !== "https:") {
    throw new Error("Daraja reversal callback URLs must use HTTPS");
  }
  const receiverIdentifierType =
    process.env.DARAJA_REVERSAL_RECEIVER_IDENTIFIER_TYPE?.trim() || "11";
  if (!/^\d{1,2}$/.test(receiverIdentifierType)) {
    throw new Error("DARAJA_REVERSAL_RECEIVER_IDENTIFIER_TYPE is invalid");
  }
  return {
    resultUrl: resultUrl.toString(),
    timeoutUrl: timeoutUrl.toString(),
    receiverIdentifierType,
  };
}

function apiBaseUrl(environment: DarajaEnvironment): string {
  return environment === "sandbox"
    ? "https://sandbox.safaricom.co.ke"
    : "https://api.safaricom.co.ke";
}

export function normalizeDarajaPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("0")
    ? `254${digits.slice(1)}`
    : digits.startsWith("7") || digits.startsWith("1")
      ? `254${digits}`
      : digits;

  if (!/^254[17]\d{8}$/.test(normalized)) {
    throw new Error("Enter a valid Kenyan M-Pesa phone number.");
  }
  return normalized;
}

function nairobiTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}${part("month")}${part("day")}${part("hour")}${part("minute")}${part("second")}`;
}

async function readDarajaResponse(
  response: Response,
  requestMayHaveSucceeded: boolean,
): Promise<DarajaResponse> {
  let payload: DarajaResponse;
  try {
    payload = (await response.json()) as DarajaResponse;
  } catch {
    throw new DarajaApiError(
      "Safaricom returned an invalid response.",
      requestMayHaveSucceeded,
    );
  }
  if (!response.ok) {
    throw new DarajaApiError(
      payload.errorMessage ?? "Safaricom request failed.",
      requestMayHaveSucceeded,
    );
  }
  return payload;
}

async function getAccessToken(config: DarajaConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64");
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl(config.environment)}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        cache: "no-store",
      },
    );
  } catch {
    throw new DarajaApiError(
      "Safaricom authentication could not be reached.",
      false,
    );
  }
  const payload = await readDarajaResponse(response, false);
  if (!payload.access_token) {
    throw new DarajaApiError("Safaricom did not return an access token.", false);
  }

  const expiresIn = Number(payload.expires_in ?? 3600);
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  };
  return payload.access_token;
}

function stkPassword(config: DarajaConfig, timestamp: string): string {
  return Buffer.from(
    `${config.shortcode}${config.passkey}${timestamp}`,
  ).toString("base64");
}

export async function initiateDarajaStkPush(input: {
  amountKes: number;
  phone: string;
  bookingReference: string;
}): Promise<{
  merchantRequestId: string;
  checkoutRequestId: string;
  customerMessage: string | null;
  rawResponse: DarajaResponse;
}> {
  if (!Number.isSafeInteger(input.amountKes) || input.amountKes <= 0) {
    throw new Error("M-Pesa payment amount must be a positive whole KES amount.");
  }

  const config = getDarajaConfig();
  const timestamp = nairobiTimestamp();
  const phoneNumber = normalizeDarajaPhone(input.phone);
  const token = await getAccessToken(config);
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl(config.environment)}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode,
          Password: stkPassword(config, timestamp),
          Timestamp: timestamp,
          TransactionType: config.transactionType,
          Amount: input.amountKes,
          PartyA: phoneNumber,
          PartyB: config.shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: config.callbackUrl,
          AccountReference: input.bookingReference.replace(/[^A-Za-z0-9]/g, "").slice(0, 12),
          TransactionDesc: "Stay booking",
        }),
        cache: "no-store",
      },
    );
  } catch {
    throw new DarajaApiError("Safaricom could not be reached.", true);
  }

  const payload = await readDarajaResponse(response, true);
  if (String(payload.ResponseCode) !== "0") {
    throw new DarajaApiError(
      payload.ResponseDescription ?? "Safaricom rejected the payment request.",
      false,
    );
  }
  if (!payload.MerchantRequestID || !payload.CheckoutRequestID) {
    throw new DarajaApiError(
      "Safaricom did not return payment request identifiers.",
      true,
    );
  }

  return {
    merchantRequestId: payload.MerchantRequestID,
    checkoutRequestId: payload.CheckoutRequestID,
    customerMessage:
      typeof payload.CustomerMessage === "string"
        ? payload.CustomerMessage
        : null,
    rawResponse: payload,
  };
}

export async function queryDarajaStkStatus(checkoutRequestId: string) {
  const config = getDarajaConfig();
  const timestamp = nairobiTimestamp();
  const token = await getAccessToken(config);
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl(config.environment)}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode,
          Password: stkPassword(config, timestamp),
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
        cache: "no-store",
      },
    );
  } catch {
    throw new DarajaApiError("Safaricom payment status could not be queried.", true);
  }
  const payload = await readDarajaResponse(response, true);
  if (
    payload.CheckoutRequestID &&
    payload.CheckoutRequestID !== checkoutRequestId
  ) {
    throw new DarajaApiError("Safaricom returned a mismatched payment status.", true);
  }
  return payload;
}

export async function initiateDarajaB2CPayment(input: {
  amountKes: number;
  phone: string;
  requestId: string;
  purpose?: "host_payout" | "guest_refund";
}): Promise<{
  conversationId: string;
  originatorConversationId: string;
  rawResponse: DarajaResponse;
}> {
  if (!Number.isSafeInteger(input.amountKes) || input.amountKes <= 0) {
    throw new Error("B2C amount must be a positive whole KES amount.");
  }

  const daraja = getDarajaConfig();
  const b2c = getDarajaB2CConfig();
  const token = await getAccessToken(daraja);
  const phoneNumber = normalizeDarajaPhone(input.phone);
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl(daraja.environment)}/mpesa/b2c/v1/paymentrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          InitiatorName: b2c.initiatorName,
          SecurityCredential: b2c.securityCredential,
          CommandID: "BusinessPayment",
          Amount: input.amountKes,
          PartyA: daraja.shortcode,
          PartyB: phoneNumber,
          Remarks: `${input.purpose === "guest_refund" ? "Guest refund" : "Host payout"} ${input.requestId.slice(0, 12)}`,
          QueueTimeOutURL: b2c.timeoutUrl,
          ResultURL: b2c.resultUrl,
          Occasion: input.requestId,
        }),
        cache: "no-store",
      },
    );
  } catch {
    throw new DarajaApiError("Safaricom B2C could not be reached.", true);
  }

  const payload = await readDarajaResponse(response, true);
  if (String(payload.ResponseCode) !== "0") {
    throw new DarajaApiError(
      payload.ResponseDescription ?? "Safaricom rejected the B2C request.",
      false,
    );
  }
  if (!payload.ConversationID || !payload.OriginatorConversationID) {
    throw new DarajaApiError(
      "Safaricom did not return B2C request identifiers.",
      true,
    );
  }

  return {
    conversationId: payload.ConversationID,
    originatorConversationId: payload.OriginatorConversationID,
    rawResponse: payload,
  };
}

export async function initiateDarajaB2CReversal(input: {
  amountKes: number;
  originalTransactionId: string;
  requestId: string;
  reason: string;
}): Promise<{
  conversationId: string;
  originatorConversationId: string;
  rawResponse: DarajaResponse;
}> {
  if (!Number.isSafeInteger(input.amountKes) || input.amountKes <= 0) {
    throw new Error("Reversal amount must be a positive whole KES amount.");
  }
  if (!/^[A-Za-z0-9]{8,30}$/.test(input.originalTransactionId)) {
    throw new Error("Invalid Safaricom B2C transaction ID.");
  }

  const daraja = getDarajaConfig();
  const b2c = getDarajaB2CConfig();
  const reversal = getDarajaReversalConfig();
  const token = await getAccessToken(daraja);
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl(daraja.environment)}/mpesa/reversal/v1/request`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Initiator: b2c.initiatorName,
          SecurityCredential: b2c.securityCredential,
          CommandID: "TransactionReversal",
          TransactionID: input.originalTransactionId,
          Amount: input.amountKes,
          ReceiverParty: daraja.shortcode,
          RecieverIdentifierType: reversal.receiverIdentifierType,
          ResultURL: reversal.resultUrl,
          QueueTimeOutURL: reversal.timeoutUrl,
          Remarks: `Host payout reversal ${input.requestId.slice(0, 12)}`,
          Occasion: input.reason.slice(0, 100),
        }),
        cache: "no-store",
      },
    );
  } catch {
    throw new DarajaApiError("Safaricom reversal request could not be reached.", true);
  }

  const payload = await readDarajaResponse(response, true);
  if (String(payload.ResponseCode) !== "0") {
    throw new DarajaApiError(
      payload.ResponseDescription ?? "Safaricom rejected the reversal request.",
      false,
    );
  }
  if (!payload.ConversationID || !payload.OriginatorConversationID) {
    throw new DarajaApiError(
      "Safaricom did not return reversal request identifiers.",
      true,
    );
  }
  return {
    conversationId: payload.ConversationID,
    originatorConversationId: payload.OriginatorConversationID,
    rawResponse: payload,
  };
}
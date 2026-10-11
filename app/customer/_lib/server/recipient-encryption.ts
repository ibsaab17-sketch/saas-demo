import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const encodedKey =
    process.env.RECIPIENT_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      "RECIPIENT_ENCRYPTION_KEY is not configured.",
    );
  }

  const key = Buffer.from(
    encodedKey,
    "base64",
  );

  if (key.length !== 32) {
    throw new Error(
      "RECIPIENT_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}

/**
 * Encrypt a recipient bank account number.
 *
 * Stored format:
 * version.iv.authTag.ciphertext
 *
 * IV, authentication tag and ciphertext are
 * Base64 encoded.
 */
export function encryptRecipientAccountNumber(
  accountNumber: string,
): string {
  const normalized =
    accountNumber.replace(/\s/g, "");

  if (!normalized) {
    throw new Error(
      "Bank account number is required.",
    );
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(
    ALGORITHM,
    key,
    iv,
    {
      authTagLength: AUTH_TAG_LENGTH,
    },
  );

  const encrypted = Buffer.concat([
    cipher.update(
      normalized,
      "utf8",
    ),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/**
 * Decrypt a recipient bank account number.
 *
 * This function must only be called from
 * trusted server-side code.
 */
export function decryptRecipientAccountNumber(
  encryptedValue: string,
): string {
  const parts =
    encryptedValue.split(".");

  if (
    parts.length !== 4 ||
    parts[0] !== "v1"
  ) {
    throw new Error(
      "Invalid encrypted account number format.",
    );
  }

  const [, ivBase64, tagBase64, dataBase64] =
    parts;

  const key = getEncryptionKey();

  const iv = Buffer.from(
    ivBase64,
    "base64",
  );

  const authTag = Buffer.from(
    tagBase64,
    "base64",
  );

  const encrypted = Buffer.from(
    dataBase64,
    "base64",
  );

  if (iv.length !== IV_LENGTH) {
    throw new Error(
      "Invalid encryption IV.",
    );
  }

  if (
    authTag.length !==
    AUTH_TAG_LENGTH
  ) {
    throw new Error(
      "Invalid encryption authentication tag.",
    );
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    iv,
    {
      authTagLength: AUTH_TAG_LENGTH,
    },
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
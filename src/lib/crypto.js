/**
 * crypto.js
 * -----------------------------------------------------------------------
 * Client-side cryptography helpers.
 *
 * Security notes:
 * - AES-256-GCM is used for all encryption (authenticated encryption:
 *   tampering with ciphertext is detectable, unlike AES-CBC).
 * - Keys are derived from the user's PIN via PBKDF2 (100,000 iterations,
 *   SHA-256) rather than hashing the PIN directly with SHA-256. This is a
 *   deliberate upgrade over the Ledger & Bid pattern (plain SHA-256 hash),
 *   because PBKDF2 is deliberately slow, which matters a lot for PINs
 *   (short, low-entropy secrets are vulnerable to brute force otherwise).
 * - A fresh random salt and IV are generated per encryption operation and
 *   stored alongside the ciphertext (they don't need to be secret).
 * - Nothing here ever calls localStorage/sessionStorage — encrypted
 *   material is persisted to Supabase, not the browser.
 */

const PBKDF2_ITERATIONS = 100_000;

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
}

/** Derive an AES-256 key from a PIN/passphrase + salt using PBKDF2. */
async function deriveKey(pin, salt, usage = ["encrypt", "decrypt"]) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

/**
 * Hash a PIN for storage/verification (login checks), using PBKDF2.
 * Returns a single string: `salt:iterations:hash`, all base64/plain.
 */
export async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${toBase64(salt)}:${PBKDF2_ITERATIONS}:${toBase64(bits)}`;
}

/** Verify a PIN against a stored hash produced by hashPin(). */
export async function verifyPin(pin, stored) {
  const [saltB64, iterStr, hashB64] = stored.split(":");
  const salt = new Uint8Array(fromBase64(saltB64));
  const iterations = parseInt(iterStr, 10);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toBase64(bits) === hashB64;
}

/** Encrypt a JS value (will be JSON-stringified) with a PIN-derived key. */
export async function encryptWithPin(pin, value) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt, ["encrypt"]);
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ciphertext),
  };
}

/** Decrypt a payload produced by encryptWithPin(). Throws if the PIN is wrong
 *  or the data was tampered with (GCM auth tag check fails). */
export async function decryptWithPin(pin, payload) {
  const salt = new Uint8Array(fromBase64(payload.salt));
  const iv = new Uint8Array(fromBase64(payload.iv));
  const key = await deriveKey(pin, salt, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    fromBase64(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * lib/secretHash.ts — Client-side SHA-256 hashing
 * ═══════════════════════════════════════════════════════════════════
 *
 * Uses the Web Crypto API (crypto.subtle) when available — i.e. in
 * secure contexts (HTTPS or localhost).
 *
 * Falls back to a self-contained pure-JS SHA-256 implementation when
 * crypto.subtle is unavailable (e.g. HTTP access via a local IP such
 * as 192.168.x.x during development).
 *
 * Both paths produce identical, spec-compliant SHA-256 hex digests.
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── Helpers ──────────────────────────────────────────────────────

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// ─── Pure-JS SHA-256 ───────────────────────────────────────────────
// Used when crypto.subtle is not available (non-secure HTTP context).
// Fully UTF-8 aware via TextEncoder — supports Arabic and all Unicode.

function sha256PureJS(input: string): string {
  // Right-rotate 32-bit integer
  function rotr(n: number, x: number): number {
    return (n >>> x) | (n << (32 - x));
  }

  // SHA-256 round constants
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // Initial hash values (first 32 bits of fractional parts of sqrt of first 8 primes)
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a;
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  // Encode input as UTF-8 bytes (supports full Unicode / Arabic)
  const bytes: number[] = Array.from(new TextEncoder().encode(input));
  const msgLen = bytes.length;

  // ── Pre-processing: padding ──────────────────────────────────
  // Append bit '1' (0x80 byte), then zeros until length ≡ 56 (mod 64)
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0x00);

  // Append original length in bits as 64-bit big-endian
  // For any realistic input, the high 32 bits are zero.
  const bitLen = msgLen * 8;
  bytes.push(0, 0, 0, 0); // high 32 bits (always 0 for inputs < 512 MB)
  bytes.push(
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff,
  );

  // ── Process each 512-bit (64-byte) block ─────────────────────
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array<number>(64).fill(0);

    // Load first 16 words from this block
    for (let i = 0; i < 16; i++) {
      w[i] =
        (bytes[offset + i * 4] << 24) |
        (bytes[offset + i * 4 + 1] << 16) |
        (bytes[offset + i * 4 + 2] << 8) |
        bytes[offset + i * 4 + 3];
    }

    // Extend to 64 words
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    // Working variables
    let a = h0,
      b = h1,
      c = h2,
      d = h3;
    let e = h4,
      f = h5,
      g = h6,
      h = h7;

    // 64 rounds of compression
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;

      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    // Add compressed chunk to current hash value
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  // ── Produce final 256-bit (32-byte) digest as hex string ─────
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => (v >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

// ─── Unified digest function ───────────────────────────────────────
// Tries crypto.subtle first; falls back to pure-JS if unavailable.

const digestSha256 = async (input: string): Promise<string> => {
  const subtle = globalThis.crypto?.subtle;

  if (subtle) {
    // Secure context (HTTPS / localhost) — use native Web Crypto API
    const encoded = new TextEncoder().encode(input);
    const digest = await subtle.digest("SHA-256", encoded);
    return toHex(digest);
  }

  // Non-secure context (HTTP / local IP) — use pure-JS fallback
  return sha256PureJS(input);
};

// ─── Public API ───────────────────────────────────────────────────

export const isSha256Hex = (value: string): boolean =>
  SHA256_HEX_REGEX.test(value);

export const hashPassword = (password: string): Promise<string> =>
  digestSha256(password);

export const normalizeSecurityAnswer = (answer: string): string =>
  answer.toLowerCase().trim();

export const hashSecurityAnswer = (answer: string): Promise<string> =>
  digestSha256(normalizeSecurityAnswer(answer));

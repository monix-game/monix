import * as crypto from 'node:crypto';
import { v4 } from 'uuid';
import { WEBAUTHN_RP_ID } from '../constants';
import type { IPasskey } from '../../common/models/user';

// ---------- In-memory challenge store ----------
// Challenges are short-lived. Keyed by the client's (username | nonce) for
// registration and by credential lookup session for authentication.
interface PendingChallenge {
  challenge: string;
  username: string;
  expires_at: number;
}

const pendingChallenges = new Map<string, PendingChallenge>();

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cleanExpiredChallenges() {
  const now = Date.now();
  for (const [key, value] of pendingChallenges) {
    if (value.expires_at < now) {
      pendingChallenges.delete(key);
    }
  }
}

export function createChallengeForKey(key: string, username: string): string {
  cleanExpiredChallenges();
  const challenge = crypto.randomBytes(32).toString('base64url');
  pendingChallenges.set(key, {
    challenge,
    username,
    expires_at: Date.now() + CHALLENGE_TTL_MS,
  });
  return challenge;
}

export function getChallengeForKey(key: string): PendingChallenge | undefined {
  cleanExpiredChallenges();
  const value = pendingChallenges.get(key);
  if (!value) return undefined;
  if (value.expires_at < Date.now()) {
    pendingChallenges.delete(key);
    return undefined;
  }
  return value;
}

export function deleteChallengeForKey(key: string) {
  pendingChallenges.delete(key);
}

// ---------- CBOR parsing ----------
// A minimal CBOR decoder sufficient to parse WebAuthn attestation objects and
// COSE keys. All integers are treated as numbers; buffers for byte strings.
// Deserializing untrusted binary is inherently dynamic - no-unsafe rules are
// scoped out of this boundary; values are re-narrowed where they are consumed.
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cborDecode(bytes: Buffer | Uint8Array): any {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  function readBytes(len: number): Buffer {
    const buf = Buffer.from(bytes.subarray(offset, offset + len));
    offset += len;
    return buf;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readValue(): any {
    const initial = view.getUint8(offset);
    offset += 1;
    const majorType = initial >> 5;
    const additionalInfo = initial & 0x1f;

    let value: number;
    if (additionalInfo < 24) {
      value = additionalInfo;
    } else if (additionalInfo === 24) {
      value = view.getUint8(offset);
      offset += 1;
    } else if (additionalInfo === 25) {
      value = view.getUint16(offset);
      offset += 2;
    } else if (additionalInfo === 26) {
      value = view.getUint32(offset);
      offset += 4;
    } else if (additionalInfo === 27) {
      const big = view.getBigUint64(offset);
      offset += 8;
      value = Number(big);
    } else {
      throw new Error('Unsupported CBOR additional info');
    }

    switch (majorType) {
      case 0:
        return value; // unsigned int
      case 1:
        return -1 - value; // negative int
      case 2:
        return readBytes(value); // byte string
      case 3: {
        // text string
        const text = Buffer.from(bytes.subarray(offset, offset + value)).toString('utf8');
        offset += value;
        return text;
      }
      case 4: {
        // array
        const arr = [];
        for (let i = 0; i < value; i++) {
          arr.push(readValue());
        }
        return arr;
      }
      case 5: {
        // map
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {};
        for (let i = 0; i < value; i++) {
          const key = readValue();
          obj[key] = readValue();
        }
        return obj;
      }
      default:
        throw new Error('Unsupported CBOR major type');
    }
  }

  return readValue();
}

// ---------- COSE key parsing ----------
// COSE_Key (RFC 8152) - a CBOR map. We support the two common algorithms used
// by passkeys: ES256 (-7, ECDSA P-256) and RS256 (-257, RSA).
interface ParsedPublicKey {
  kty: number;
  alg: number;
  crv?: number;
  x?: Buffer;
  y?: Buffer;
  n?: Buffer;
  e?: Buffer;
}

 
function parseCOSEKey(coseKey: Uint8Array): ParsedPublicKey {
  const decoded = cborDecode(Buffer.from(coseKey));

  // The map keys are integers per COSE spec.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toBuffer = (v: any): Buffer | undefined =>
    v === undefined || typeof v === 'number' ? undefined : Buffer.isBuffer(v) ? v : Buffer.from(v as Uint8Array);

  const key: ParsedPublicKey = {
    kty: Number(decoded[1]),
    alg: Number(decoded[3]),
    crv: decoded[1] === 2 ? Number(decoded[-1]) : undefined,
    x: toBuffer(decoded[-2]),
    y: toBuffer(decoded[-3]),
    n: toBuffer(decoded[-1]),
    e: toBuffer(decoded[-2]),
  };

  return key;
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

// Convert a COSE public key into a PEM-formatted SPKI certificate suitable for
// use with crypto.createPublicKey.
function coseKeyToSPKI(coseKey: Uint8Array): crypto.KeyObject {
  const key = parseCOSEKey(coseKey);

  if (key.alg === -7) {
    // ES256
    if (!key.x || !key.y) throw new Error('Invalid ES256 public key');
    // DER encoding of an EC public key (P-256):
    // SEQUENCE { SEQUENCE { OID id-ecPublicKey, OID prime256v1 }, BIT STRING { 0x04 || X || Y } }
    const point = Buffer.concat([Buffer.from([0x04]), key.x, key.y]);

    const oidEcPublicKey = Buffer.from('06072a8648ce3d0201', 'hex'); // id-ecPublicKey
    const oidPrime256v1 = Buffer.from('06082a8648ce3d030107', 'hex'); // prime256v1

    const algorithm = derSequence(Buffer.concat([oidEcPublicKey, oidPrime256v1]));
    const bitString = derBitString(point);

    const spki = derSequence(Buffer.concat([algorithm, bitString]));
    return crypto.createPublicKey({
      key: spki,
      format: 'der',
      type: 'spki',
    });
  }

  if (key.alg === -257) {
    // RS256
    if (!key.n || !key.e) throw new Error('Invalid RSA public key');

    const algorithm = derSequence(Buffer.from('06092a864886f70d010101', 'hex')); // rsaEncryption
    const rsaPublicKey = derSequence(Buffer.concat([derInteger(key.n), derInteger(key.e)]));
    const bitString = derBitString(rsaPublicKey);

    const spki = derSequence(Buffer.concat([algorithm, bitString]));
    return crypto.createPublicKey({
      key: spki,
      format: 'der',
      type: 'spki',
    });
  }

  throw new Error(`Unsupported COSE algorithm: ${key.alg}`);
}

function derLength(len: number): Buffer {
  if (len < 0x80) {
    return Buffer.from([len]);
  }
  const bytes: number[] = [];
  while (len > 0) {
    bytes.unshift(len & 0xff);
    len >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function derSequence(contents: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30]), derLength(contents.length), contents]);
}

function derInteger(contents: Buffer): Buffer {
  // Prepend 0x00 if the high bit is set to keep the integer positive.
  const withPad = contents[0] & 0x80 ? Buffer.concat([Buffer.from([0x00]), contents]) : contents;
  return Buffer.concat([Buffer.from([0x02]), derLength(withPad.length), withPad]);
}

function derBitString(contents: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from([0x03]),
    derLength(contents.length + 1),
    Buffer.from([0x00]),
    contents,
  ]);
}

// Normalize an ECDSA signature from WebAuthn (raw r || s, 32 bytes each) to a
// DER-encoded signature for crypto.verify.
function derSignature(r: Buffer, s: Buffer): Buffer {
  return derSequence(Buffer.concat([derInteger(r), derInteger(s)]));
}

// ---------- Base64url helpers ----------
export function base64UrlToBuffer(value: string): Buffer {
  const clean = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(clean, 'base64');
}

// ---------- Attestation / assertion parsed structures ----------
export interface RegistrationCredentialDTO {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
}

export interface AuthenticationCredentialDTO {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
}

export interface ParsedAttestation {
  authData: Buffer;
  clientDataJSON: Buffer;
  id: string;
  rawId: Buffer;
}

export function parseRegistrationResponse(
  credential: RegistrationCredentialDTO
): ParsedAttestation {
  const clientDataJSON = base64UrlToBuffer(credential.response.clientDataJSON);
  const attestationObject = base64UrlToBuffer(credential.response.attestationObject);

   
  const decoded = cborDecode(attestationObject) as { authData?: Uint8Array };
  const authData = Buffer.from(decoded.authData || new Uint8Array());

  return {
    authData,
    clientDataJSON,
    id: credential.id,
    rawId: base64UrlToBuffer(credential.rawId),
  };
}

export interface ParsedAssertion {
  authData: Buffer;
  clientDataJSON: Buffer;
  signature: Buffer;
  id: string;
  rawId: Buffer;
  userHandle: Buffer | null;
}

export function parseAuthenticationResponse(credential: AuthenticationCredentialDTO): ParsedAssertion {
  return {
    authData: base64UrlToBuffer(credential.response.authenticatorData),
    clientDataJSON: base64UrlToBuffer(credential.response.clientDataJSON),
    signature: base64UrlToBuffer(credential.response.signature),
    id: credential.id,
    rawId: base64UrlToBuffer(credential.rawId),
    userHandle: credential.response.userHandle
      ? base64UrlToBuffer(credential.response.userHandle)
      : null,
  };
}

// ---------- ClientData parsing ----------
interface ClientData {
  type: string;
  challenge: string;
  origin: string;
}

export function parseClientData(clientDataJSON: Buffer): ClientData {
  const parsed = JSON.parse(clientDataJSON.toString('utf8')) as ClientData;
  return parsed;
}

// ---------- AuthenticatorData parsing ----------
export function parseAuthData(authData: Buffer): {
  rpIdHash: Buffer;
  flags: number;
  flagsUp: boolean;
  flagsUV: boolean;
  flagsAt: boolean;
  signCount: number;
  aaguid?: Buffer;
  credentialId?: Buffer;
  credentialPublicKey?: Uint8Array;
} {
  if (authData.length < 37) throw new Error('Authenticator data too short');

  const rpIdHash = authData.subarray(0, 32);
  const flags = authData[32];
  const signCount = authData.readUInt32BE(33);

  let offset = 37;
  let aaguid: Buffer | undefined;
  let credentialId: Buffer | undefined;
  let credentialPublicKey: Uint8Array | undefined;

  const flagsAt = (flags & 0x40) !== 0;
  if (flagsAt) {
    aaguid = authData.subarray(offset, offset + 16);
    offset += 16;
    const credIdLen = authData.readUInt16BE(offset);
    offset += 2;
    credentialId = authData.subarray(offset, offset + credIdLen);
    offset += credIdLen;
    credentialPublicKey = authData.subarray(offset);
  }

  return {
    rpIdHash,
    flags,
    flagsUp: (flags & 0x01) !== 0,
    flagsUV: (flags & 0x04) !== 0,
    flagsAt,
    signCount,
    aaguid,
    credentialId,
    credentialPublicKey,
  };
}

// ---------- High-level verification helpers ----------

export function verifyRegistration(
  parsed: ParsedAttestation,
  expectedChallenge: string,
  expectedOrigin: string | string[]
): {
  credentialId: string;
  publicKey: Buffer;
  signCount: number;
} {
  const clientData = parseClientData(parsed.clientDataJSON);
  if (clientData.type !== 'webauthn.create') {
    throw new Error('Invalid clientData type');
  }
  if (clientData.challenge !== expectedChallenge) {
    throw new Error('Challenge mismatch');
  }
  if (!matchesOrigin(clientData.origin, expectedOrigin)) {
    throw new Error('Origin mismatch');
  }

  const authData = parseAuthData(parsed.authData);
  if (!authData.flagsAt) {
    throw new Error('Missing attested credential data');
  }

  const rpIdHash = crypto.createHash('sha256').update(WEBAUTHN_RP_ID).digest();
  if (!authData.rpIdHash.equals(rpIdHash)) {
    throw new Error('RP ID hash mismatch');
  }

  if (!authData.credentialPublicKey || !authData.credentialId) {
    throw new Error('Missing credential public key');
  }

  const publicKey = coseKeyToSPKI(authData.credentialPublicKey);
  const spki = Buffer.from(publicKey.export({ type: 'spki', format: 'der' }));

  // Verify the credential id we parsed from authData matches the client's rawId.
  if (!authData.credentialId.equals(parsed.rawId)) {
    throw new Error('Credential ID mismatch');
  }

  return {
    credentialId: Buffer.from(parsed.rawId).toString('base64url'),
    publicKey: spki,
    signCount: authData.signCount,
  };
}

export function verifyAuthentication(
  parsed: ParsedAssertion,
  passkey: IPasskey,
  expectedChallenge: string,
  expectedOrigin: string | string[]
): number {
  const clientData = parseClientData(parsed.clientDataJSON);
  if (clientData.type !== 'webauthn.get') {
    throw new Error('Invalid clientData type');
  }
  if (clientData.challenge !== expectedChallenge) {
    throw new Error('Challenge mismatch');
  }
  if (!matchesOrigin(clientData.origin, expectedOrigin)) {
    throw new Error('Origin mismatch');
  }

  const authData = parseAuthData(parsed.authData);

  const rpIdHash = crypto.createHash('sha256').update(WEBAUTHN_RP_ID).digest();
  if (!authData.rpIdHash.equals(rpIdHash)) {
    throw new Error('RP ID hash mismatch');
  }

  const storedPublicKey = crypto.createPublicKey({
    key: Buffer.from(passkey.publicKey),
    format: 'der',
    type: 'spki',
  });

  const clientDataHash = crypto.createHash('sha256').update(parsed.clientDataJSON).digest();
  const signingBase = Buffer.concat([parsed.authData, clientDataHash]);

  const keyAsn1 = storedPublicKey.asymmetricKeyType;
  let signatureToVerify = parsed.signature;
  if (keyAsn1 === 'ec' && parsed.signature.length === 64) {
    // Raw ECDSA (r || s) -> DER
    signatureToVerify = derSignature(parsed.signature.subarray(0, 32), parsed.signature.subarray(32));
  }

  const valid = crypto.verify('sha256', signingBase, storedPublicKey, signatureToVerify);

  if (!valid) {
    throw new Error('Signature verification failed');
  }

  return authData.signCount;
}

function matchesOrigin(origin: string, expected: string | string[]): boolean {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  return expectedList.includes(origin);
}

// ---------- Misc ----------
export function generateCredentialID(): string {
  return v4();
}

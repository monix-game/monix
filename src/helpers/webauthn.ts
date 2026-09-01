// Client-side WebAuthn helpers. These convert between the DTO shapes used by the
// server (base64url strings) and the binary structures expected by the browser.

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface PublicKeyCredentialDescriptorDTO {
  id: string;
  type: 'public-key';
  transports?: AuthenticatorTransport[];
}

export interface CreationOptionsDTO {
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { alg: number; type: 'public-key' }[];
  timeout: number;
  attestation: 'none' | 'direct' | 'indirect' | 'enterprise';
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey?: 'required' | 'preferred' | 'discouraged';
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
  excludeCredentials?: PublicKeyCredentialDescriptorDTO[];
}

export interface RequestOptionsDTO {
  challenge: string;
  rpId: string;
  timeout: number;
  userVerification?: 'required' | 'preferred' | 'discouraged';
  allowCredentials?: PublicKeyCredentialDescriptorDTO[];
}

export interface RegistrationCredentialDTO {
  id: string;
  rawId: string;
  response: { clientDataJSON: string; attestationObject: string };
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

/**
 * Decode a server public-key credential creation options blob (from
 * `/passkey/options/register`) into an `PublicKeyCredentialCreationOptions`.
 */
export function decodeCreationOptions(options: CreationOptionsDTO): PublicKeyCredentialCreationOptions {
  return {
    challenge: base64UrlToArrayBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: base64UrlToArrayBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation,
    authenticatorSelection: options.authenticatorSelection,
    excludeCredentials: (options.excludeCredentials || []).map((c) => ({
      id: base64UrlToArrayBuffer(c.id),
      type: c.type,
    })),
  };
}

/**
 * Convert a `PublicKeyCredential` created by the browser into the DTO the server
 * expects for `/passkey/verify/register`.
 */
export function serializeRegistrationCredential(
  credential: PublicKeyCredential
): RegistrationCredentialDTO {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64Url(response.attestationObject),
    },
  };
}

/**
 * Decode a server authentication options blob (from `/passkey/options/auth`) into
 * a `PublicKeyCredentialRequestOptions`.
 */
export function decodeRequestOptions(options: RequestOptionsDTO): PublicKeyCredentialRequestOptions {
  return {
    challenge: base64UrlToArrayBuffer(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification,
    allowCredentials: (options.allowCredentials || []).map((c) => ({
      id: base64UrlToArrayBuffer(c.id),
      type: c.type,
      transports: c.transports || [],
    })),
  };
}

/**
 * Convert an `PublicKeyCredential` returned for authentication into the DTO the
 * server expects for `/passkey/verify/auth`.
 */
export function serializeAuthenticationCredential(
  credential: PublicKeyCredential
): AuthenticationCredentialDTO {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
      signature: arrayBufferToBase64Url(response.signature),
      userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : undefined,
    },
  };
}

export function isWebAuthnSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.credentials && !!navigator.credentials.create;
}

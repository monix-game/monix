import type { IUser } from '../../common/models/user';
import { verifyTOTPToken } from './totp';
import { verifyRecoveryCode, generateRecoveryCodes } from './recovery-codes';
import {
  parseAuthenticationResponse,
  verifyAuthentication,
  getChallengeForKey,
  deleteChallengeForKey,
  type AuthenticationCredentialDTO,
} from './webauthn';

export interface TwoFactorState {
  has_totp: boolean;
  has_passkeys: boolean;
  has_recovery_codes: boolean;
  needs_2fa: boolean;
}

/**
 * Compute the unified 2FA state for a user.
 *
 * 2FA is considered enabled when the user has at least one active method:
 * either a TOTP authenticator (setup_totp) or one or more passkeys.
 */
export function getTwoFactorState(
  user: Pick<IUser, 'setup_totp' | 'passkeys' | 'recovery_codes'>
): TwoFactorState {
  const has_totp = !!user.setup_totp;
  const has_passkeys = (user.passkeys || []).length > 0;
  const has_recovery_codes = (user.recovery_codes || []).some(c => !c.used);
  return {
    has_totp,
    has_passkeys,
    has_recovery_codes,
    needs_2fa: has_totp || has_passkeys,
  };
}

export interface SecondFactorInput {
  token?: string; // TOTP 6-digit code
  recoveryCode?: string; // downloaded recovery code
  // Passkey assertion: `tempToken` (from `/passkey/options/auth`) plus the raw
  // browser credential. The challenge stored under the tempToken was issued
  // after the password was verified, so satisfying it is the second factor.
  tempToken?: string;
  passkeyCredential?: AuthenticationCredentialDTO;
  origins?: string | string[];
}

export type SecondFactorResult =
  | { verified: true; user: IUser; changed: boolean }
  | { verified: false; reason: string };

/**
 * The single, unified entry point for verifying any second factor during login.
 *
 * Given a user that has 2FA enabled, this validates whichever factor was provided:
 * a TOTP code, a recovery code, or a verified passkey assertion. It returns the
 * (possibly mutated, e.g. recovery code now consumed or passkey counter bumped)
 * user.
 */
export function verifySecondFactor(
  user: IUser,
  input: SecondFactorInput
): SecondFactorResult {
  const state = getTwoFactorState(user);

  // Passkey assertion: verify the WebAuthn signature against the challenge that
  // was issued for this tempToken after the password check.
  if (input.tempToken) {
    if (!state.has_passkeys) {
      return { verified: false, reason: 'No passkeys registered for this account' };
    }
    if (!input.passkeyCredential) {
      return { verified: false, reason: 'Missing passkey credential' };
    }
    const pending = getChallengeForKey(`auth:${input.tempToken}`);
    if (!pending) {
      deleteChallengeForKey(`auth:${input.tempToken}`);
      return { verified: false, reason: 'No pending passkey authentication, please try again' };
    }

    let parsed;
    try {
      parsed = parseAuthenticationResponse(input.passkeyCredential);
    } catch (err) {
      return { verified: false, reason: `Invalid passkey payload: ${(err as Error).message}` };
    }

    const passkey = (user.passkeys || []).find(pk => pk.id === parsed.id);
    if (!passkey) {
      deleteChallengeForKey(`auth:${input.tempToken}`);
      return { verified: false, reason: 'Passkey not recognized' };
    }

    let counter;
    try {
      counter = verifyAuthentication(
        parsed,
        passkey,
        pending.challenge,
        input.origins || []
      );
    } catch (err) {
      deleteChallengeForKey(`auth:${input.tempToken}`);
      return { verified: false, reason: `Passkey authentication failed: ${(err as Error).message}` };
    }

    deleteChallengeForKey(`auth:${input.tempToken}`);

    if (counter > 0 && counter > passkey.counter) {
      passkey.counter = counter;
      return { verified: true, user, changed: true };
    }
    return { verified: true, user, changed: false };
  }

  // Recovery codes can bypass ANY other method.
  if (input.recoveryCode) {
    const valid = verifyRecoveryCode(user.recovery_codes || [], input.recoveryCode);
    if (!valid) {
      return { verified: false, reason: 'Invalid recovery code' };
    }
    return { verified: true, user, changed: true };
  }

  // TOTP authenticator code.
  if (state.has_totp) {
    if (!input.token) {
      return { verified: false, reason: '2FA token required' };
    }
    const isTokenValid = verifyTOTPToken(user.totp_secret!, input.token);
    if (!isTokenValid) {
      return { verified: false, reason: 'Invalid 2FA token' };
    }
    return { verified: true, user, changed: false };
  }

  return { verified: false, reason: 'Select a verification method to continue' };
}

/**
 * Seed recovery codes the first time any 2FA method becomes enabled.
 * Returns the plaintext codes to show the user exactly when they are created.
 */
export function ensureRecoveryCodes(
  user: Pick<IUser, 'recovery_codes'>
): { created: boolean; plain: string[] } {
  if (user.recovery_codes && user.recovery_codes.length > 0) {
    return { created: false, plain: [] };
  }
  const { plain, hashes } = generateRecoveryCodes();
  user.recovery_codes = hashes;
  return { created: true, plain };
}

import { Elysia, t } from 'elysia';
import { updateUser, getUserByUUID } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';
import {
  parseRegistrationResponse,
  verifyRegistration,
  getChallengeForKey,
  deleteChallengeForKey,
  type RegistrationCredentialDTO,
  type ParsedAttestation,
} from '../../../helpers/webauthn';
import { ensureRecoveryCodes } from '../../../helpers/2fa';
import { CORS_ORIGINS } from '../../../constants';

export const passkeyVerifyRegister = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/passkey/verify/register',
    async ({ body, authUser, set }) => {
      const b = body as { credential?: RegistrationCredentialDTO; name?: string };
      const { credential, name } = b;
      const cred = credential;
      if (!cred || !name) {
        set.status = 400;
        return { error: 'Missing credential or name' };
      }

      const authUser2 = authUser;
      if (!authUser2) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const user = await getUserByUUID(authUser2.uuid);
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const pending = getChallengeForKey(`register:${user.uuid}`);
      if (!pending) {
        set.status = 400;
        return { error: 'No pending registration, please try again' };
      }

      let parsed: ParsedAttestation;
      try {
        parsed = parseRegistrationResponse(cred);
      } catch (err) {
        set.status = 400;
        return { error: `Invalid registration payload: ${(err as Error).message}` };
      }

      const origins = CORS_ORIGINS.includes('*')
        ? ['http://localhost:5173', 'http://localhost:6200', 'https://monix.proplayer919.dev']
        : CORS_ORIGINS;

      let result: {
        credentialId: string;
        publicKey: Buffer;
        signCount: number;
      };
      try {
        result = verifyRegistration(parsed, pending.challenge, origins);
      } catch (err) {
        deleteChallengeForKey(`register:${user.uuid}`);
        set.status = 401;
        return { error: `Registration verification failed: ${(err as Error).message}` };
      }

      // Ensure this credential isn't already registered.
      const duplicate = (user.passkeys || []).some(pk => pk.id === result.credentialId);
      if (duplicate) {
        deleteChallengeForKey(`register:${user.uuid}`);
        set.status = 400;
        return { error: 'This passkey is already registered' };
      }

      // Store the new passkey.
      const was2FAEnabled = !!user.setup_totp || (user.passkeys || []).length > 0;
      user.passkeys = user.passkeys || [];
      user.passkeys.push({
        id: result.credentialId,
        publicKey: result.publicKey,
        counter: result.signCount,
        name: typeof name === 'string' ? name.slice(0, 50) : 'Passkey',
        created_at: Date.now(),
        transports: Array.isArray(cred.response?.transports)
          ? cred.response.transports
          : [],
      });

      // If this passkey is the user's very first 2FA method, seed recovery codes.
      const recovery = was2FAEnabled ? { created: false, plain: [] as string[] } : ensureRecoveryCodes(user);

      await updateUser(user);
      deleteChallengeForKey(`register:${user.uuid}`);

      if (recovery.created) {
        return {
          message: 'Passkey registered successfully',
          recoveryCodes: recovery.plain,
        };
      }

      return { message: 'Passkey registered successfully' };
    },
    {
      body: t.Object({
        credential: t.Any(),
        name: t.Optional(t.String()),
      }),
    }
  );

export default passkeyVerifyRegister;

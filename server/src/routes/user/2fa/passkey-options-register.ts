import { Elysia } from 'elysia';
import { deriveAuth, onlyAuth } from '../../../middleware';
import { createChallengeForKey } from '../../../helpers/webauthn';
import { WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME } from '../../../constants';

export const passkeyRegisterOptions = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post('/passkey/options/register', ({ authUser }) => {
    const user = authUser!;

    // Bind the challenge to this user (they are authenticated).
    const challenge = createChallengeForKey(`register:${user.uuid}`, user.username);

    const publicKey = {
      challenge,
      rp: {
        id: WEBAUTHN_RP_ID,
        name: WEBAUTHN_RP_NAME,
      },
      user: {
        id: Buffer.from(user.uuid).toString('base64url'),
        name: user.username,
        displayName: user.username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: 60000,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      attestation: 'none',
      excludeCredentials: (user.passkeys || []).map(pk => ({
        id: Buffer.from(pk.id, 'base64url').toString('base64url'),
        type: 'public-key' as const,
      })),
    };

    return { options: publicKey };
  });

export default passkeyRegisterOptions;

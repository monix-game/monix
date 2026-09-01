import { Elysia } from 'elysia';
import { getUserByUUID, updateUser } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';
import { generateRecoveryCodes } from '../../../helpers/recovery-codes';

export const recoveryGenerate = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post('/recovery/generate', async ({ authUser, set }) => {
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

    // Recovery codes only make sense when some form of 2FA is enabled.
    const has2FA = !!user.setup_totp || (user.passkeys || []).length > 0;
    if (!has2FA) {
      set.status = 400;
      return { error: 'Enable 2FA before generating recovery codes' };
    }

    const { plain, hashes } = generateRecoveryCodes();
    user.recovery_codes = hashes;
    await updateUser(user);

    set.status = 201;
    return {
      message: 'Recovery codes generated. Store them somewhere safe - they will only be shown once.',
      codes: plain,
    };
  });

export default recoveryGenerate;

import { Elysia } from 'elysia';
import setup2fa from './setup';
import finish2fa from './finish';
import remove2fa from './remove';
import needs2fa from './needs';
import passkeyRegisterOptions from './passkey-options-register';
import passkeyVerifyRegister from './passkey-verify-register';
import passkeyAuthOptions from './passkey-options-auth';
import passkeyList from './passkey-list';
import passkeyRename from './passkey-rename';
import passkeyDelete from './passkey-delete';
import recoveryGenerate from './recovery-generate';
import recoveryCount from './recovery-count';

export const twoFARoutes = new Elysia()
  .use(setup2fa)
  .use(finish2fa)
  .use(remove2fa)
  .use(needs2fa)
  .use(passkeyRegisterOptions)
  .use(passkeyVerifyRegister)
  .use(passkeyAuthOptions)
  .use(passkeyList)
  .use(passkeyRename)
  .use(passkeyDelete)
  .use(recoveryGenerate)
  .use(recoveryCount);

export default twoFARoutes;

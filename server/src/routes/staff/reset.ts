import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getUserByUUID, resetAllUsers } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { isResetTarget, RESET_CONFIRMATION, RESET_TARGETS } from '../../../common/resets';

export const resetUsers = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .post(
    '/reset',
    async ({ body, authUser, set, request, path, headers }) => {
      const fetchedUser = authUser?.uuid ? await getUserByUUID(authUser.uuid) : null;

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const payload = (body ?? {}) as { targets?: unknown; confirmation?: unknown };
      const confirmation = typeof payload.confirmation === 'string' ? payload.confirmation : '';

      if (confirmation !== RESET_CONFIRMATION) {
        set.status = 400;
        return { error: 'Confirmation required' };
      }

      if (!Array.isArray(payload.targets) || payload.targets.length === 0) {
        set.status = 400;
        return { error: 'At least one reset target is required' };
      }

      if (!payload.targets.every(isResetTarget)) {
        set.status = 400;
        return { error: 'Unknown reset target' };
      }

      const targets = Array.from(new Set(payload.targets));
      const affected = await resetAllUsers(targets);
      const labels = RESET_TARGETS.filter(target => targets.includes(target.id))
        .map(target => target.label)
        .join(', ');

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'warn',
        type: 'moderation',
        message: 'Bulk user data reset',
        data: buildRequestLogData({ path, method: request.method, headers }, [
          { key: 'targets', value: labels, inline: false },
          { key: 'affected users', value: affected },
        ]),
        username: fetchedUser.username,
      });

      return { affected, targets };
    },
    {
      body: t.Any(),
    }
  );

export default resetUsers;

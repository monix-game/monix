import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';
import { convertToSettings, type ISettings } from '../../../common/models/settings';

export const setSetting = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/set',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      const { key, value } = body as { key: keyof ISettings; value: unknown };

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      if (key === undefined || value === undefined) {
        set.status = 400;
        return { error: 'Key and value are required' };
      }

      const settings = { ...fetchedUser.settings, [key]: value };

      fetchedUser.settings = convertToSettings(settings as ISettings);
      await updateUser(fetchedUser);

      return { message: 'Settings updated successfully' };
    },
    {
      body: t.Object({
        key: t.Optional(t.String()),
        value: t.Optional(t.Any()),
      }),
    }
  );

export default setSetting;

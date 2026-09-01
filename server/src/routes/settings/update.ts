import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';
import { convertToSettings, type ISettings } from '../../../common/models/settings';

export const updateSettings = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);
      const { settings } = body as { settings: ISettings };

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      if (!settings) {
        set.status = 400;
        return { error: 'Settings are required' };
      }

      fetchedUser.settings = convertToSettings(settings);
      await updateUser(fetchedUser);

      return { message: 'Settings updated successfully' };
    },
    {
      body: t.Object({ settings: t.Optional(t.Any()) }),
    }
  );

export default updateSettings;

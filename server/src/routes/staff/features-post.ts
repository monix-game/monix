import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getGlobalSettings, getUserByUUID, updateGlobalSettings } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { convertToGlobalSettings } from '../../../common/models/globalSettings';

export const updateFeatures = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .post(
    '/features',
    async ({ body, authUser, set, request, path, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { settings } = body;

      if (!settings) {
        set.status = 400;
        return { error: 'Settings are required' };
      }

      const oldSettings = (await getGlobalSettings()).features;
      const nextSettings = convertToGlobalSettings(settings);
      await updateGlobalSettings(nextSettings);

      const changedKeys = Object.keys(nextSettings.features).filter(
        key =>
          JSON.stringify(oldSettings[key as keyof typeof oldSettings]) !==
          JSON.stringify(nextSettings.features[key as keyof typeof nextSettings.features])
      );

      const formatSettingValue = (value: boolean) => (value ? 'enabled' : 'disabled');

      const keyDisplayMap: { [key: string]: string } = {
        resourcesMarket: 'Resources/Market',
        fishingAquarium: 'Fishing/Aquarium',
        pets: 'Pets',
        social: 'Social',
      };

      const changeLogEntries = changedKeys.length
        ? changedKeys.map(key => {
            const previousValue = oldSettings[key as keyof typeof oldSettings];
            const nextValue = nextSettings.features[key as keyof typeof nextSettings.features];
            return {
              key: keyDisplayMap[key] || key,
              value: `${formatSettingValue(previousValue)} -> ${formatSettingValue(nextValue)}`,
            };
          })
        : [{ key: 'changed_flags', value: 'none' }];

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'feature-flag',
        message: 'Feature settings updated',
        data: buildRequestLogData({ path, method: request.method, headers }, changeLogEntries),
        username: fetchedUser.username,
      });

      return { settings: nextSettings };
    },
    {
      body: t.Object({ settings: t.Optional(t.Record(t.String(), t.Any())) }),
    }
  );

export default updateFeatures;

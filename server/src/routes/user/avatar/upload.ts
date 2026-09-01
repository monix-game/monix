import { Elysia, t } from 'elysia';
import { updateUser } from '../../../db';
import { deriveAuth, onlyActive } from '../../../middleware';
import { processAvatar } from '../../../helpers/avatar';

export const uploadAvatar = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/upload/avatar',
    async ({ body, authUser, set }) => {
      const user = authUser;
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { avatar_url } = body;
      if (!avatar_url) {
        set.status = 400;
        return { error: 'Missing avatar URL' };
      }

      // Only allow image data URIs to prevent SSRF attacks
      if (!avatar_url.toLowerCase().startsWith('data:image/')) {
        set.status = 400;
        return { error: 'Avatar URL must be a data URI' };
      }

      // Validate that the data URI has an image MIME type and is base64-encoded
      const dataUriMatch = /^data:([^;]+);base64,/i.exec(avatar_url);
      if (!dataUriMatch?.[1].toLowerCase().startsWith('image/')) {
        set.status = 400;
        return { error: 'Avatar URL must be an image data URI' };
      }

      // Limit data URI size to 20 MB to prevent memory exhaustion
      const MAX_AVATAR_SIZE = 20 * 1024 * 1024;
      if (avatar_url.length > MAX_AVATAR_SIZE) {
        set.status = 400;
        return { error: 'Avatar image is too large' };
      }

      // Process the avatar: crop to square if needed and convert to data URI
      try {
        const processedAvatar = await processAvatar(avatar_url);
        user.avatar_data_uri = processedAvatar;
        await updateUser(user);

        return { message: 'Avatar updated successfully' };
      } catch (error) {
        set.status = 400;
        return {
          error: error instanceof Error ? error.message : 'Failed to process avatar',
        };
      }
    },
    {
      body: t.Object({ avatar_url: t.Optional(t.String()) }),
    }
  );

export default uploadAvatar;

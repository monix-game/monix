import { Elysia, t } from 'elysia';
import { getPetByUUID, getUserByUUID, updatePet } from '../../db';
import { petToDoc } from '../../../common/models/pet';
import { deriveAuth, onlyActive } from '../../middleware';

export const namePet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/name',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);
      const { pet_uuid, name } = body;

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      if (!pet_uuid || !name) {
        set.status = 400;
        return { error: 'Missing pet_uuid or name' };
      }

      const pet = await getPetByUUID(pet_uuid);

      if (!pet) {
        set.status = 404;
        return { error: 'Pet not found' };
      }

      // Check if the pet already has a name
      if (pet.name) {
        set.status = 400;
        return { error: 'Pet already has a name' };
      }

      // Check if the name is valid (only letters, numbers, spaces, underscores, and hyphens, max length 15)
      const nameRegex = /^[a-zA-Z0-9 _-]{1,15}$/;
      if (!nameRegex.test(name)) {
        set.status = 400;
        return {
          error:
            'Invalid name. Names can only contain letters, numbers, spaces, underscores, and hyphens, and must be between 1 and 15 characters long.',
        };
      }

      pet.name = name;
      pet.exp += 10; // Award 10 exp for naming the pet
      await updatePet(pet);

      return {
        message: 'Pet named successfully',
        pet: petToDoc(pet),
      };
    },
    {
      body: t.Object({
        pet_uuid: t.Optional(t.String()),
        name: t.Optional(t.String()),
      }),
    }
  );

export default namePet;

import { Elysia, t } from 'elysia';
import { getAllUsers } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';

export const listUsers = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('helper'))
  .post(
    '/users',
    async ({ body }) => {
      const { filter } = body;

      let users = await getAllUsers();

      if (filter) {
        const lowerFilter = filter.toLowerCase();
        users = users.filter(
          u =>
            u.username.toLowerCase().includes(lowerFilter) ||
            u.uuid.toLowerCase().includes(lowerFilter)
        );
      }

      return { users };
    },
    {
      body: t.Object({ filter: t.Optional(t.String()) }),
    }
  );

export default listUsers;

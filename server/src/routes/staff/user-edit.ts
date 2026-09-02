import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyRole } from '../../middleware';
import { buildRequestLogData, log } from '../../helpers/logging';
import { processAvatar } from '../../helpers/avatar';
import { hasPowerOver, hasRole } from '../../../common/roles';
import { cosmetics } from '../../../common/cosmetics/cosmetics';

type Equipped = { nameplate?: string; tag?: string };

export const editUser = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .post(
    '/user/:uuid/edit',
    async ({ params, body, authUser, set, request, path, headers }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { uuid } = params;
      if (!uuid) {
        set.status = 400;
        return { error: 'Missing uuid parameter' };
      }

      const targetUser = await getUserByUUID(uuid);
      if (!targetUser) {
        set.status = 404;
        return { error: 'Target user not found' };
      }

      const originalUser: {
        money: number;
        gems: number;
        avatar_data_uri?: string;
        role: string;
        pet_slots: number;
        cosmetics_unlocked: string[];
        equipped_cosmetics: Equipped;
      } = {
        money: targetUser.money,
        gems: targetUser.gems,
        avatar_data_uri: targetUser.avatar_data_uri,
        role: targetUser.role,
        pet_slots: targetUser.pet_slots,
        cosmetics_unlocked: targetUser.cosmetics_unlocked ? [...targetUser.cosmetics_unlocked] : [],
        equipped_cosmetics: (targetUser.equipped_cosmetics as Equipped) || {},
      };

      if (!hasPowerOver(fetchedUser.role, targetUser.role) || !hasRole(fetchedUser.role, 'admin')) {
        set.status = 403;
        return { error: 'You do not have permission to edit this user' };
      }

      const {
        money,
        gems,
        avatar_url,
        remove_avatar,
        role,
        pet_slots,
        cosmetics_unlocked,
        equipped_cosmetics,
      } = body as {
        money?: number;
        gems?: number;
        avatar_url?: string;
        remove_avatar?: boolean;
        role?: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
        pet_slots?: number;
        cosmetics_unlocked?: string[];
        equipped_cosmetics?: Equipped;
      };

      if (money !== undefined) {
        if (typeof money !== 'number' || !Number.isFinite(money) || money < 0) {
          set.status = 400;
          return { error: 'Money must be a non-negative number' };
        }
        targetUser.money = Math.floor(money);
      }

      if (gems !== undefined) {
        if (typeof gems !== 'number' || !Number.isFinite(gems) || (gems < 0 && gems !== -1)) {
          set.status = 400;
          return { error: 'Gems must be a non-negative number (except -1)' };
        }
        targetUser.gems = Math.floor(gems);
      }

      if (role !== undefined) {
        if (!hasPowerOver(fetchedUser.role, role) || role === fetchedUser.role) {
          set.status = 403;
          return { error: 'You do not have permission to assign this role' };
        }
        targetUser.role = role;
      }

      if (pet_slots !== undefined) {
        if (typeof pet_slots !== 'number' || !Number.isFinite(pet_slots) || pet_slots < 1) {
          set.status = 400;
          return { error: 'Pet slots must be a number of 1 or more' };
        }
        targetUser.pet_slots = Math.floor(pet_slots);
      }

      if (cosmetics_unlocked !== undefined) {
        if (!Array.isArray(cosmetics_unlocked)) {
          set.status = 400;
          return { error: 'Cosmetics unlocked must be an array' };
        }
        const validCosmetics = new Set(cosmetics.map(c => c.id));
        targetUser.cosmetics_unlocked = cosmetics_unlocked.filter(id => validCosmetics.has(id));
      }

      if (equipped_cosmetics !== undefined) {
        const validCosmetics = new Map(cosmetics.map(c => [c.id, c]));
        const nextEquipped: Equipped = targetUser.equipped_cosmetics || {};

        const updateEquipped = (key: 'nameplate' | 'tag', cosmeticId?: string): boolean => {
          if (!cosmeticId) {
            nextEquipped[key] = undefined;
            return true;
          }
          const cosmetic = validCosmetics.get(cosmeticId);
          if (cosmetic?.type !== key) {
            return false;
          }
          nextEquipped[key] = cosmeticId;
          return true;
        };

        if (!updateEquipped('nameplate', equipped_cosmetics.nameplate)) {
          set.status = 400;
          return { error: 'Invalid nameplate cosmetic' };
        }
        if (!updateEquipped('tag', equipped_cosmetics.tag)) {
          set.status = 400;
          return { error: 'Invalid tag cosmetic' };
        }

        targetUser.equipped_cosmetics = nextEquipped;
        targetUser.cosmetics_unlocked ??= [];
        const unlockedSet = new Set(targetUser.cosmetics_unlocked);
        if (nextEquipped.nameplate) unlockedSet.add(nextEquipped.nameplate);
        if (nextEquipped.tag) unlockedSet.add(nextEquipped.tag);
        targetUser.cosmetics_unlocked = Array.from(unlockedSet);
      }

      if (remove_avatar) {
        targetUser.avatar_data_uri = undefined;
      } else if (avatar_url) {
        if (!avatar_url.toLowerCase().startsWith('data:image/')) {
          set.status = 400;
          return { error: 'Avatar URL must be a data URI' };
        }

        const avatarDataUriMatch = /^data:([^;]+);base64,/i.exec(avatar_url);
        if (!avatarDataUriMatch?.[1].toLowerCase().startsWith('image/')) {
          set.status = 400;
          return { error: 'Avatar URL must be an image data URI' };
        }

        const MAX_AVATAR_SIZE = 20 * 1024 * 1024;
        if (avatar_url.length > MAX_AVATAR_SIZE) {
          set.status = 400;
          return { error: 'Avatar image is too large' };
        }

        try {
          const processedAvatar = await processAvatar(avatar_url);
          targetUser.avatar_data_uri = processedAvatar;
        } catch (error) {
          set.status = 400;
          return {
            error: error instanceof Error ? error.message : 'Failed to process avatar',
          };
        }
      }

      await updateUser(targetUser);

      const changeDetails: { key: string; value: string; inline?: boolean }[] = [];

      if (money !== undefined) {
        changeDetails.push({ key: 'money', value: `${originalUser.money} -> ${targetUser.money}` });
      }

      if (gems !== undefined) {
        changeDetails.push({ key: 'gems', value: `${originalUser.gems} -> ${targetUser.gems}` });
      }

      if (role !== undefined) {
        changeDetails.push({ key: 'role', value: `${originalUser.role} -> ${targetUser.role}` });
      }

      if (pet_slots !== undefined) {
        changeDetails.push({ key: 'pet_slots', value: `${originalUser.pet_slots} -> ${targetUser.pet_slots}` });
      }

      if (remove_avatar) {
        changeDetails.push({ key: 'avatar', value: `${originalUser.avatar_data_uri ? 'present' : 'none'} -> removed` });
      } else if (avatar_url) {
        const preview = avatar_url.slice(0, 64)
          .concat(avatar_url.length > 64 ? '...' : '');
        changeDetails.push({ key: 'avatar', value: `${originalUser.avatar_data_uri ? 'present' : 'none'} -> set to new avatar (${preview})` });
      }

      if (cosmetics_unlocked !== undefined) {
        const prev = originalUser.cosmetics_unlocked || [];
        const next = targetUser.cosmetics_unlocked || [];
        const added = next.filter(id => !prev.includes(id));
        const removed = prev.filter(id => !next.includes(id));
        const parts: string[] = [];
        if (added.length) parts.push(`added: [${added.join(', ')}]`);
        if (removed.length) parts.push(`removed: [${removed.join(', ')}]`);
        if (!parts.length) parts.push('no changes');
        changeDetails.push({ key: 'cosmetics_unlocked', value: parts.join('; ') });
      }

      if (equipped_cosmetics !== undefined) {
        const prevEq = originalUser.equipped_cosmetics;
        const nextEq = (targetUser.equipped_cosmetics as Equipped) || {};
        const keys: Array<keyof Equipped> = ['nameplate', 'tag'];
        keys.forEach(k => {
          const prevVal = prevEq[k] ?? 'none';
          const nextVal = nextEq[k] ?? 'none';
          if (prevVal !== nextVal) {
            changeDetails.push({ key: `equipped_${k}`, value: `${prevVal} -> ${nextVal}` });
          }
        });
      }

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'moderation',
        message: 'User edited',
        data: buildRequestLogData(
          { path, method: request.method, headers },
          [{ key: 'target', value: targetUser.username }, ...changeDetails]
        ),
        username: fetchedUser.username,
      });

      return { user: targetUser };
    },
    {
      body: t.Any(),
    }
  );

export default editUser;

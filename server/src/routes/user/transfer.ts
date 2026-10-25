import { Elysia, t } from 'elysia';
import { getUserByUsername, mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { createLogger } from '../../logging';
import { smartFormatNumber } from '../../../common/math';

const log = createLogger('transfer');

type TransferOutcome =
  { ok: 'error'; status: number; error: string } | { ok: 'success'; message: string };

export const transferMoney = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/transfer',
    async ({ body, authUser, set }) => {
      if (!authUser) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const username = body.username.trim();
      const amount = body.amount;

      if (!username) {
        set.status = 400;
        return { error: 'Enter a username.' };
      }
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        set.status = 400;
        return { error: 'Enter a whole-dollar amount greater than zero.' };
      }

      const recipient = await getUserByUsername(username);
      if (!recipient) {
        set.status = 404;
        return { error: 'No player with that username exists.' };
      }
      if (recipient.uuid === authUser.uuid) {
        set.status = 400;
        return { error: "You can't send money to yourself." };
      }

      // Debit the sender first so two concurrent transfers can never spend the
      // same money. The per-user lock in mutateUserAndSave serializes each leg.
      const debit = await mutateUserAndSave<TransferOutcome>(authUser.uuid, user => {
        if (user.money < amount) {
          return {
            changed: false,
            value: { ok: 'error', status: 400, error: 'Insufficient money' },
          };
        }

        user.money -= amount;
        return { changed: true, value: { ok: 'success', message: '' } };
      });

      if (!debit) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (debit.ok === 'error') {
        set.status = debit.status;
        return { error: debit.error };
      }

      try {
        const credit = await mutateUserAndSave(recipient.uuid, user => {
          user.money += amount;
          return { changed: true, value: true };
        });

        if (!credit) {
          throw new Error('Recipient no longer exists');
        }
      } catch (err) {
        // The recipient disappeared between lookup and credit. Refund the
        // sender rather than losing the money.
        log.error(
          { err, from: authUser.uuid, to: recipient.uuid, amount },
          'transfer credit failed'
        );
        await mutateUserAndSave(authUser.uuid, user => {
          user.money += amount;
          return { changed: true, value: true };
        });
        set.status = 500;
        return { error: 'Could not complete the transfer. Your money was returned.' };
      }

      log.info(
        { from: authUser.username, to: recipient.username, amount },
        'money transferred between users'
      );

      return {
        message: `Sent ${smartFormatNumber(amount, true, false, false)} to ${recipient.username}.`,
      };
    },
    {
      body: t.Object({
        username: t.String(),
        amount: t.Number(),
      }),
    }
  );

export default transferMoney;

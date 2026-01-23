import { sendNyxMessage } from './nyx';
import { IMessage } from '../../common/models/message';
import { IUser } from '../../common/models/user';
import { hasRole } from '../../common/roles';
import { deleteMessagesByRoomUUID } from '../db';

export interface CommandResult {
  message: IMessage | null;
  error?: string;
}

export interface Command {
  name: string;
  requiredRole: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  execute: (
    args: string[],
    message: IMessage,
    user: IUser,
    room_uuid: string
  ) => Promise<CommandResult>;
}

const commands: Command[] = [
  {
    name: 'echo',
    requiredRole: 'helper',
    execute: async (args, message, user, room_uuid) => {
      const echoContent = args.join(' ');
      if (echoContent.trim() === '') {
        await sendNyxMessage(user.uuid, 'Echo message cannot be empty.', room_uuid);
        return { message, error: 'Echo message cannot be empty.' };
      }

      await sendNyxMessage(user.uuid, echoContent, room_uuid, false);
      return { message: null };
    },
  },
  {
    name: 'shout',
    requiredRole: 'helper',
    execute: async (args, message, user, room_uuid) => {
      const content = args.join(' ');
      if (content.trim() === '') {
        await sendNyxMessage(user.uuid, 'Shout message cannot be empty.', room_uuid);
        return { message, error: 'Shout message cannot be empty.' };
      }

      message.shouted = true;
      message.content = content;
      return { message };
    },
  },
  {
    name: 'clear',
    requiredRole: 'mod',
    execute: async (args, message, user, room_uuid) => {
      // If the command is /clear N, delete last N messages
      // If N is not provided, clear last 10 messages
      let numMessages = 10;
      if (args.length > 0) {
        const parsed = parseInt(args[0], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 1000) {
          numMessages = parsed;
        } else {
          await sendNyxMessage(
            user.uuid,
            'Please provide a valid number of messages to clear (1-1000).',
            room_uuid
          );
          return { message, error: 'Invalid number of messages to clear.' };
        }
      }

      // Clear the messages
      await deleteMessagesByRoomUUID(room_uuid, numMessages);
      await sendNyxMessage(
        user.uuid,
        `Cleared the last ${numMessages} messages in this room.`,
        room_uuid
      );

      return { message: null };
    },
  },
];

export async function handleCommand(
  message: IMessage,
  user: IUser,
  room_uuid: string
): Promise<CommandResult> {
  if (!message.content.startsWith('/')) {
    return { message };
  }

  const parts = message.content.slice(1).split(' ');
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const command = commands.find(cmd => cmd.name === commandName);
  if (!command) {
    await sendNyxMessage(user.uuid, `Unknown command: /${commandName}`, room_uuid);
    return { message, error: `Unknown command: /${commandName}` };
  }

  if (!hasRole(user.role, command.requiredRole)) {
    await sendNyxMessage(
      user.uuid,
      `You do not have permission to use the /${commandName} command.`,
      room_uuid
    );
    return { message, error: `Insufficient permissions for command: /${commandName}` };
  }

  return command.execute(args, message, user, room_uuid);
}

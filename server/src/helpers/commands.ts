import { sendNyxMessage } from './nyx';
import { IMessage } from '../../common/models/message';
import { IUser } from '../../common/models/user';
import { hasRole } from '../../common/roles';

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

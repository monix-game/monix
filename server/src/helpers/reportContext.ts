import { getMessagesByRoomUUID } from '../db';
import type { IMessage } from '../../common/models/message';
import type { ReportContextMessage } from '../../common/models/report';

const CONTEXT_MESSAGE_LIMIT = 50;

/**
 * Snapshots the chat history up to (and including) the reported message at the
 * time the report was made, so staff can review the surrounding context later
 * even once the room has moved on.
 */
export async function buildReportContext(
  reported: IMessage
): Promise<ReportContextMessage[]> {
  const messages = await getMessagesByRoomUUID(reported.room_uuid);

  return messages
    .filter(
      m =>
        !m.ephemeral &&
        (m.time_sent ?? 0) <= (reported.time_sent ?? 0)
    )
    .slice(-CONTEXT_MESSAGE_LIMIT)
    .map(m => ({
      message_uuid: m.uuid,
      sender_username: m.sender_username || m.sender_uuid || 'unknown',
      content: m.content,
      image_url: m.image_url,
      time_sent: m.time_sent ?? 0,
      deleted: Boolean(m.deleted),
      reported: m.uuid === reported.uuid,
    }));
}
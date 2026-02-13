type SpamReason = {
  id: string;
  name: string;
};

const SPAM_REASONS: Record<SpamReason['id'], SpamReason> = {
  duplicate_message: { id: 'duplicate_message', name: 'Duplicate Message' },
  flooding: { id: 'flooding', name: 'Flooding' },
  bursting: { id: 'bursting', name: 'Bursting' },
  link_spam: { id: 'link_spam', name: 'Link Spam' },
  mention_spam: { id: 'mention_spam', name: 'Mention Spam' },
};

type SpamDecision = {
  isSpam: boolean;
  reasons: SpamReason[];
  shouldAutoBan: boolean;
};

type RecentMessage = {
  time: number;
  content: string;
  room_uuid: string;
};

type UserSpamState = {
  recent: RecentMessage[];
  lastAutoBanAt?: number;
};

const SPAM_CONFIG = {
  duplicateWindowMs: 8000,
  floodWindowMs: 10000,
  floodMax: 5,
  burstWindowMs: 60000,
  burstMax: 12,
  mentionLimit: 5,
  urlLimit: 2,
  autoBanCooldownMs: 5 * 60 * 1000,
};

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
const MENTION_REGEX = /@\w+/g;

const spamState = new Map<string, UserSpamState>();

function normalizeContent(content: string): string {
  return content.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

function getUserState(user_uuid: string): UserSpamState {
  const existing = spamState.get(user_uuid);
  if (existing) return existing;

  const created: UserSpamState = { recent: [] };
  spamState.set(user_uuid, created);
  return created;
}

function pruneRecent(state: UserSpamState, now: number) {
  state.recent = state.recent.filter(entry => now - entry.time <= SPAM_CONFIG.burstWindowMs);
}

export function checkSocialSpam(params: {
  user_uuid: string;
  room_uuid: string;
  content: string;
  now?: number;
}): SpamDecision {
  const { user_uuid, room_uuid, content } = params;
  const now = params.now ?? Date.now();
  const normalized = normalizeContent(content);
  const state = getUserState(user_uuid);

  pruneRecent(state, now);

  const recentFlood = state.recent.filter(entry => now - entry.time <= SPAM_CONFIG.floodWindowMs);

  const reasons: SpamReason[] = [];

  const duplicate = state.recent.some(
    entry => entry.content === normalized && now - entry.time <= SPAM_CONFIG.duplicateWindowMs
  );
  if (duplicate) reasons.push(SPAM_REASONS.duplicate_message);

  if (recentFlood.length >= SPAM_CONFIG.floodMax) reasons.push(SPAM_REASONS.flooding);

  if (state.recent.length >= SPAM_CONFIG.burstMax) reasons.push(SPAM_REASONS.bursting);

  const urlCount = content.match(URL_REGEX)?.length ?? 0;
  if (urlCount >= SPAM_CONFIG.urlLimit) reasons.push(SPAM_REASONS.link_spam);

  const mentionCount = content.match(MENTION_REGEX)?.length ?? 0;
  if (mentionCount >= SPAM_CONFIG.mentionLimit) reasons.push(SPAM_REASONS.mention_spam);

  state.recent.push({ time: now, content: normalized, room_uuid });

  const canAutoBan =
    !state.lastAutoBanAt || now - state.lastAutoBanAt > SPAM_CONFIG.autoBanCooldownMs;

  if (reasons.length > 0 && canAutoBan) {
    state.lastAutoBanAt = now;
  }

  return {
    isSpam: reasons.length > 0,
    reasons,
    shouldAutoBan: reasons.length > 0 && canAutoBan,
  };
}

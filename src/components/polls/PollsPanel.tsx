import React, { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import styles from '../../pages/game/Game.module.css';
import { createPoll, fetchPolls, voteInPoll, type PollView } from '../../helpers/polls';
import { Button } from '../button/Button';
import { Modal } from '../modal/Modal';
import { EmojiText } from '../EmojiText';
import { formatRemainingTime } from '../../../server/common/math';

const toLocalInputDateTime = (timeMs: number) => {
  const offsetMs = new Date(timeMs).getTimezoneOffset() * 60000;
  return new Date(timeMs - offsetMs).toISOString().slice(0, 16);
};

const fromLocalInputDateTime = (value: string) => new Date(value).getTime();

const createPollDraftOption = () => ({
  id: `opt-${Math.random().toString(36).slice(2, 9)}`,
  label: '',
  emoji: '',
});

interface PollsPanelProps {
  canCreatePoll?: boolean;
}

export const PollsPanel: React.FC<PollsPanelProps> = ({ canCreatePoll = false }) => {
  const [now, setNow] = useState(() => Date.now());
  const [polls, setPolls] = useState<PollView[]>([]);
  const [pollsLoading, setPollsLoading] = useState<boolean>(false);
  const [pollsError, setPollsError] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollStartsAt, setPollStartsAt] = useState<string>(() => toLocalInputDateTime(Date.now()));
  const [pollEndsAt, setPollEndsAt] = useState<string>(() =>
    toLocalInputDateTime(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [pollOptionsDraft, setPollOptionsDraft] = useState<
    { id: string; label: string; emoji: string }[]
  >(() => [createPollDraftOption(), createPollDraftOption()]);
  const [pollCreateError, setPollCreateError] = useState<string | null>(null);
  const [pollCreateSubmitting, setPollCreateSubmitting] = useState<boolean>(false);
  const [pollVotePending, setPollVotePending] = useState<string | null>(null);
  const [isPollCreateOpen, setIsPollCreateOpen] = useState<boolean>(false);

  const activePolls = useMemo(
    () => polls.filter(poll => poll.status !== 'ended').sort((a, b) => a.ends_at - b.ends_at),
    [polls]
  );
  const completedPolls = useMemo(
    () => polls.filter(poll => poll.status === 'ended').sort((a, b) => b.ends_at - a.ends_at),
    [polls]
  );

  const refreshPolls = useCallback(
    async (showLoading = false) => {
      if (showLoading) setPollsLoading(true);
      setPollsError(null);
      const nextPolls = await fetchPolls();
      if (nextPolls !== null) {
        setPolls(nextPolls);
      } else {
        setPollsError('Failed to load polls. Please try again soon.');
      }
      if (showLoading) setPollsLoading(false);
    },
    [setPolls, setPollsError, setPollsLoading]
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void refreshPolls(true);
    });
    const interval = setInterval(() => {
      startTransition(() => {
        void refreshPolls(false);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshPolls]);

  const addPollOption = useCallback(() => {
    setPollOptionsDraft(prev => {
      if (prev.length >= 8) return prev;
      return [...prev, createPollDraftOption()];
    });
  }, []);

  const updatePollOption = useCallback((id: string, field: 'label' | 'emoji', value: string) => {
    setPollOptionsDraft(prev =>
      prev.map(option => (option.id === id ? { ...option, [field]: value } : option))
    );
  }, []);

  const removePollOption = useCallback((id: string) => {
    setPollOptionsDraft(prev => {
      if (prev.length <= 2) return prev;
      return prev.filter(option => option.id !== id);
    });
  }, []);

  const resetPollForm = useCallback(() => {
    const nowMs = Date.now();
    setPollQuestion('');
    setPollStartsAt(toLocalInputDateTime(nowMs));
    setPollEndsAt(toLocalInputDateTime(nowMs + 24 * 60 * 60 * 1000));
    setPollOptionsDraft([createPollDraftOption(), createPollDraftOption()]);
    setPollCreateError(null);
  }, []);

  const handleCreatePoll = useCallback(async () => {
    if (pollCreateSubmitting) return;
    setPollCreateError(null);

    const question = pollQuestion.trim();
    if (!question) {
      setPollCreateError('Poll question is required.');
      return;
    }

    const startsAt = fromLocalInputDateTime(pollStartsAt);
    const endsAt = fromLocalInputDateTime(pollEndsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
      setPollCreateError('Please provide valid start and end times.');
      return;
    }

    if (endsAt <= startsAt) {
      setPollCreateError('Poll end time must be after the start time.');
      return;
    }

    const options = pollOptionsDraft
      .map(option => ({
        label: option.label.trim(),
        emoji: option.emoji.trim() || undefined,
      }))
      .filter(option => option.label.length > 0);

    if (options.length < 2) {
      setPollCreateError('Polls need at least two options.');
      return;
    }

    setPollCreateSubmitting(true);
    const created = await createPoll({
      question,
      options,
      starts_at: startsAt,
      ends_at: endsAt,
    });

    if (!created) {
      setPollCreateError('Failed to create poll.');
    } else {
      resetPollForm();
      setIsPollCreateOpen(false);
      void refreshPolls(false);
    }

    setPollCreateSubmitting(false);
  }, [
    pollCreateSubmitting,
    pollQuestion,
    pollStartsAt,
    pollEndsAt,
    pollOptionsDraft,
    refreshPolls,
    resetPollForm,
  ]);

  const handleVote = useCallback(
    async (pollId: string, optionId: string) => {
      if (pollVotePending) return;
      setPollVotePending(pollId);
      setPollsError(null);
      const result = await voteInPoll(pollId, optionId);
      if (!result) {
        setPollsError('Failed to cast vote. Please try again.');
      }
      void refreshPolls(false);
      setPollVotePending(null);
    },
    [pollVotePending, refreshPolls]
  );

  return (
    <div className={styles['polls-tab']}>
      <div className={styles['polls-header']}>
        <h2>Polls</h2>
        <div className={styles['polls-header-actions']}>
          {canCreatePoll && (
            <Button onClick={() => setIsPollCreateOpen(true)}>Create Poll</Button>
          )}
          <Button
            secondary
            onClick={() => void refreshPolls(true)}
            disabled={pollsLoading}
            isLoading={pollsLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {pollsError && <div className={styles['polls-error']}>{pollsError}</div>}

      {pollsLoading && polls.length === 0 ? (
        <p>Loading polls...</p>
      ) : (
        <div className={styles['polls-sections']}>
          <div className={styles['polls-section']}>
            <h3>Active Polls</h3>
            {activePolls.length === 0 && (
              <p className={styles['polls-empty']}>No active polls right now.</p>
            )}
            {activePolls.map(poll => {
              const totalVotes =
                poll.total_votes ??
                poll.results?.reduce((total, result) => total + result.count, 0) ??
                0;
              const showResults = Boolean(poll.results);
              const myVoteLabel = poll.options.find(option => option.id === poll.my_vote)?.label;
              const remainingStart = Math.max(0, Math.floor((poll.starts_at - now) / 1000));
              const remainingEnd = Math.max(0, Math.floor((poll.ends_at - now) / 1000));
              const timeLabel =
                poll.status === 'upcoming'
                  ? `Starts in ${formatRemainingTime(remainingStart) || '0s'}`
                  : `Ends in ${formatRemainingTime(remainingEnd) || '0s'}`;

              return (
                <div key={poll.uuid} className={styles['poll-card']}>
                  <div className={styles['poll-card-header']}>
                    <span className={styles['poll-question']}>{poll.question}</span>
                    <span className={styles['poll-status']}>{timeLabel}</span>
                  </div>
                  <div className={styles['poll-meta']}>
                    <span>Asked by {poll.created_by_username}</span>
                    {poll.has_voted && myVoteLabel && (
                      <span className={styles['poll-voted']}>You voted for {myVoteLabel}</span>
                    )}
                  </div>

                  {poll.status === 'upcoming' && (
                    <p className={styles['polls-empty']}>Voting opens when the poll starts.</p>
                  )}

                  {poll.status === 'active' && !poll.has_voted && (
                    <div className={styles['poll-options']}>
                      {poll.options.map(option => (
                        <button
                          key={option.id}
                          type="button"
                          className={styles['poll-option-button']}
                          onClick={() => void handleVote(poll.uuid, option.id)}
                          disabled={pollVotePending === poll.uuid}
                        >
                          <span className={styles['poll-option-label']}>
                            {option.emoji && (
                              <span className={styles['poll-option-emoji']}>
                                <EmojiText>{option.emoji}</EmojiText>
                              </span>
                            )}
                            {option.label}
                          </span>
                          <span className={styles['poll-option-action']}>Vote</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {showResults ? (
                    <div className={styles['poll-results']}>
                      {poll.options.map(option => {
                        const count =
                          poll.results?.find(result => result.option_id === option.id)?.count || 0;
                        const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                        return (
                          <div key={option.id} className={styles['poll-result-row']}>
                            <div className={styles['poll-result-meta']}>
                              <span className={styles['poll-result-label']}>
                                {option.emoji && <EmojiText>{option.emoji}</EmojiText>} {option.label}
                              </span>
                              <span className={styles['poll-result-count']}>
                                {count} vote{count === 1 ? '' : 's'} ({Math.round(percent)}%)
                              </span>
                            </div>
                            <div className={styles['poll-result-track']}>
                              <div
                                className={styles['poll-result-bar']}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className={styles['poll-result-total']}>Total votes: {totalVotes}</div>
                    </div>
                  ) : (
                    poll.status === 'active' && (
                      <div className={styles['poll-results-hidden']}>
                        Vote to reveal the results.
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles['polls-section']}>
            <h3>Completed Polls</h3>
            {completedPolls.length === 0 && (
              <p className={styles['polls-empty']}>No completed polls yet.</p>
            )}
            {completedPolls.map(poll => {
              const totalVotes =
                poll.total_votes ??
                poll.results?.reduce((total, result) => total + result.count, 0) ??
                0;
              const endedLabel = new Date(poll.ends_at).toLocaleString();
              return (
                <div key={poll.uuid} className={styles['poll-card']}>
                  <div className={styles['poll-card-header']}>
                    <span className={styles['poll-question']}>{poll.question}</span>
                    <span className={styles['poll-status']}>Ended {endedLabel}</span>
                  </div>
                  <div className={styles['poll-meta']}>
                    <span>Asked by {poll.created_by_username}</span>
                  </div>
                  <div className={styles['poll-results']}>
                    {poll.options.map(option => {
                      const count =
                        poll.results?.find(result => result.option_id === option.id)?.count || 0;
                      const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                      return (
                        <div key={option.id} className={styles['poll-result-row']}>
                          <div className={styles['poll-result-meta']}>
                            <span className={styles['poll-result-label']}>
                              {option.emoji && <EmojiText>{option.emoji}</EmojiText>} {option.label}
                            </span>
                            <span className={styles['poll-result-count']}>
                              {count} vote{count === 1 ? '' : 's'} ({Math.round(percent)}%)
                            </span>
                          </div>
                          <div className={styles['poll-result-track']}>
                            <div
                              className={styles['poll-result-bar']}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className={styles['poll-result-total']}>Total votes: {totalVotes}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canCreatePoll && (
        <Modal isOpen={isPollCreateOpen} onClose={() => setIsPollCreateOpen(false)} width={700}>
          <div className={styles['poll-create']}>
            <div className={styles['poll-create-header']}>
              <h3>Create Poll</h3>
              <Button secondary onClick={resetPollForm} disabled={pollCreateSubmitting}>
                Reset
              </Button>
            </div>
            <label className={styles['poll-form-field']}>
              <span>Question</span>
              <input
                className={styles['poll-input']}
                type="text"
                value={pollQuestion}
                onChange={event => setPollQuestion(event.target.value)}
                placeholder="Ask the community a question"
                maxLength={140}
              />
            </label>
            <div className={styles['poll-form-grid']}>
              <label className={styles['poll-form-field']}>
                <span>Starts At</span>
                <input
                  className={styles['poll-input']}
                  type="datetime-local"
                  value={pollStartsAt}
                  onChange={event => setPollStartsAt(event.target.value)}
                />
              </label>
              <label className={styles['poll-form-field']}>
                <span>Ends At</span>
                <input
                  className={styles['poll-input']}
                  type="datetime-local"
                  value={pollEndsAt}
                  onChange={event => setPollEndsAt(event.target.value)}
                />
              </label>
            </div>
            <div className={styles['poll-options-editor']}>
              <div className={styles['poll-options-header']}>
                <span>Options</span>
                <Button
                  secondary
                  onClick={addPollOption}
                  disabled={pollOptionsDraft.length >= 8}
                >
                  Add Option
                </Button>
              </div>
              {pollOptionsDraft.map(option => (
                <div key={option.id} className={styles['poll-option-row']}>
                  <input
                    className={`${styles['poll-input']} ${styles['poll-emoji-input']}`}
                    type="text"
                    value={option.emoji}
                    onChange={event => updatePollOption(option.id, 'emoji', event.target.value)}
                    placeholder="Emoji"
                    maxLength={8}
                  />
                  <input
                    className={styles['poll-input']}
                    type="text"
                    value={option.label}
                    onChange={event => updatePollOption(option.id, 'label', event.target.value)}
                    placeholder="Option label"
                    maxLength={60}
                  />
                  <Button
                    onClick={() => removePollOption(option.id)}
                    disabled={pollOptionsDraft.length <= 2}
                    color="red"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            {pollCreateError && <div className={styles['polls-error']}>{pollCreateError}</div>}
            <div className={styles['poll-create-actions']}>
              <Button
                secondary
                onClick={() => setIsPollCreateOpen(false)}
                disabled={pollCreateSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleCreatePoll()} disabled={pollCreateSubmitting}>
                {pollCreateSubmitting ? 'Creating...' : 'Create Poll'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
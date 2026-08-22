'strict';

const { TypingIndicator } = require('../TypingIndicator');

/**
 * Tracks how many in-flight commands are showing a status in a given
 * Slack Assistant thread, keyed by `channel_id:thread_ts`. Needed because a
 * new SlackTypingIndicator is constructed per request (see Adapter.typingIndicator),
 * so this can't live on `this` -- without it, two overlapping commands in the
 * same thread would race: whichever finishes first clears the status while
 * the other is still working.
 * @type {Map<string, number>}
 */
const activeStatusCounts = new Map();

class SlackTypingIndicator extends TypingIndicator {
  /**
   * @param {Hubot.Robot} robot the robot.
   * @param {Hubot.Log} logger the logger.
   */
  constructor(robot, logger) {
    super();

    /** @type {Hubot.Robot} */
    this.robot = robot;

    /** @type {Hubot.Log} */
    this.logger = logger;
  }

  /**
   * @param {Hubot.Response} res the context.
   * @param {string} status the status text.
   */
  async start(res, status) {
    const target = resolveTarget(res);
    if (target) {
      const key = threadKey(target);
      activeStatusCounts.set(key, (activeStatusCounts.get(key) || 0) + 1);
    }

    await this.setStatus(target, status);
  }

  /**
   * @param {Hubot.Response} res the context.
   */
  async stop(res) {
    const target = resolveTarget(res);
    if (target) {
      const key = threadKey(target);
      const remaining = (activeStatusCounts.get(key) || 1) - 1;

      if (remaining > 0) {
        // Another command is still working in this thread; leave its status alone.
        activeStatusCounts.set(key, remaining);
        return;
      }

      activeStatusCounts.delete(key);
    }

    await this.setStatus(target, '');
  }

  /**
   * Sets the Slack Assistant thread status, if supported. Never throws:
   * this is a nice-to-have enhancement (requires the bot's Slack app to be
   * running in Assistant mode with the right scope), so any failure is
   * logged at debug level and swallowed rather than breaking the command.
   * @param {{channel_id: string, thread_ts: string}|null} target the channel/thread to update.
   * @param {string} status the status text.
   */
  async setStatus(target, status) {
    try {
      const setStatusFn = this.robot?.adapter?.client?.web?.assistant?.threads?.setStatus;
      if (typeof setStatusFn !== 'function' || !target) return;

      await setStatusFn({ ...target, status });
    } catch (err) {
      this.logger.debug(err, 'SlackTypingIndicator.setStatus');
    }
  }
}

/**
 * Resolves the Slack channel/thread a status update should target.
 * Prefers the raw Slack event's own channel and thread_ts (the assistant
 * thread's root) over Hubot's envelope/message wrapper, since `envelope.room`
 * can be a room name rather than the channel ID `assistant.threads.setStatus`
 * requires, and a reply's `ts` is not the thread it belongs to.
 * @param {Hubot.Response} res the context.
 * @returns {{channel_id: string, thread_ts: string}|null}
 */
function resolveTarget(res) {
  const rawMessage = res.message.rawMessage || {};
  const channel_id = rawMessage.channel || res.envelope.room;
  const thread_ts = rawMessage.thread_ts || rawMessage.ts;

  if (!channel_id || !thread_ts) return null;
  return { channel_id, thread_ts };
}

/**
 * @param {{channel_id: string, thread_ts: string}} target
 * @returns {string}
 */
function threadKey(target) {
  return `${target.channel_id}:${target.thread_ts}`;
}

exports.SlackTypingIndicator = SlackTypingIndicator;

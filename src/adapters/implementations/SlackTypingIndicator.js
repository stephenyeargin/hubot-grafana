'strict';

const { TypingIndicator } = require('../TypingIndicator');

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
    await this.setStatus(res, status);
  }

  /**
   * @param {Hubot.Response} res the context.
   */
  async stop(res) {
    await this.setStatus(res, '');
  }

  /**
   * Sets the Slack Assistant thread status, if supported. Never throws:
   * this is a nice-to-have enhancement (requires the bot's Slack app to be
   * running in Assistant mode with the right scope), so any failure is
   * logged at debug level and swallowed rather than breaking the command.
   * @param {Hubot.Response} res the context.
   * @param {string} status the status text.
   */
  async setStatus(res, status) {
    try {
      const setStatusFn = this.robot?.adapter?.client?.web?.assistant?.threads?.setStatus;
      if (typeof setStatusFn !== 'function') return;

      const channel_id = res.envelope.room;
      const thread_ts = res.message.rawMessage?.ts;
      if (!channel_id || !thread_ts) return;

      await setStatusFn({ channel_id, thread_ts, status });
    } catch (err) {
      this.logger.debug(err, 'SlackTypingIndicator.setStatus');
    }
  }
}

exports.SlackTypingIndicator = SlackTypingIndicator;

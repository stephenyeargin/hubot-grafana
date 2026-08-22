'strict';

/**
 * No-op typing indicator, used for adapters that don't support a "working" status.
 */
class TypingIndicator {
  /**
   * Shows a "working" status.
   * @param {Hubot.Response} res the context.
   * @param {string} status the status text.
   */
  async start(res, status) {}

  /**
   * Clears the "working" status.
   * @param {Hubot.Response} res the context.
   */
  async stop(res) {}

  /**
   * Updates the currently-displayed status text without affecting whether
   * the indicator is considered started/stopped. Useful for showing
   * progress during a single command that posts multiple messages, since
   * e.g. Slack clears the status automatically each time a new message is
   * posted to the thread.
   * @param {Hubot.Response} res the context.
   * @param {string} status the status text.
   */
  async update(res, status) {}
}

exports.TypingIndicator = TypingIndicator;

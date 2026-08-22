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
}

exports.TypingIndicator = TypingIndicator;

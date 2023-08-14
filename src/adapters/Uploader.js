'strict';
class Uploader {
  /**
   *
   * @param {Hubot.Response} msg the context
   * @param {string} title
   * @param {*} grafanaDashboardRequest
   * @param {string} link
   */
  upload(msg, title, grafanaDashboardRequest, link) {
    throw new Error('Not supported');
  }
}
exports.Uploader = Uploader;

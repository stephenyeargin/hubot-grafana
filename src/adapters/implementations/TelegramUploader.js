'strict';
const { Uploader } = require('../Uploader');

class TelegramUploader extends Uploader {
  /**
   * Uploads the a screenshot of the dashboards.
   *
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the dashboard.
   * @param {{ body: Buffer, contentType: string}} file the screenshot.
   * @param {string} grafanaChartLink link to the Grafana chart.
   */
  upload(res, title, file, grafanaChartLink) {
    const caption = `${title}: ${grafanaChartLink}`;

    //TODO: I donnot believe this will work, needs testing
    res.sendPhoto(res.envelope.room, file.body, {
      caption,
    });
  }
}
exports.TelegramUploader = TelegramUploader;

'strict';
const { Uploader } = require('../Uploader');

class TelegramUploader extends Uploader {
  /**
   * Uploads the a screenshot of the dashboards.
   *
   * @param {Hubot.Response} res the context.
   * @param {string} title the title of the dashboard.
   * @param {({ body: Buffer, contentType: string})=>void} grafanaDashboardRequest request for getting the screenshot.
   * @param {string} grafanaChartLink link to the Grafana chart.
   */
  upload(res, title, grafanaDashboardRequest, grafanaChartLink) {
    const caption = `${title}: ${grafanaChartLink}`;
    return res.sendPhoto(res.envelope.room, grafanaDashboardRequest(), {
      caption,
    });
  }
}
exports.TelegramUploader = TelegramUploader;

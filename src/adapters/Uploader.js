'strict';
class Uploader {

  /**
   * Uploads the a screenshot of the dashboards.
   *
   * @param {Hubot.Response} res the context
   * @param {string} title the title of the dashboard.
   * @param {({ body: Buffer, contentType: string})} file request for getting the screenshot.
   * @param {string} grafanaChartLink link to the Grafana chart.
   */
  // Subclasses implement the upload interface; the base method reports unsupported uploads.
  // eslint-disable-next-line no-unused-vars
  upload(res, title, file, grafanaChartLink) {
    throw new Error('Not supported');
  }
}
exports.Uploader = Uploader;

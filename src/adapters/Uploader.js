'strict';
class Uploader {

  /**
   * Uploads the a screenshot of the dashboards.
   *
   * @param {Hubot.Response} res the context
   * @param {string} title the title of the dashboard.
   * @param {({ body: Buffer, contentType: string})=>void} grafanaDashboardRequest request for getting the screenshot.
   * @param {string} grafanaChartLink link to the Grafana chart.
   */
  upload(res, title, grafanaDashboardRequest, grafanaChartLink) {
    throw new Error('Not supported');
  }
}
exports.Uploader = Uploader;

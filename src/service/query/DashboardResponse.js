class DashboardResponse {
  constructor(imageUrl, grafanaChartLink, title) {
    /**
     * @type {string}
     */
    this.imageUrl = imageUrl;

    /**
     * @type {string}
     */
    this.grafanaChartLink = grafanaChartLink;

    /**
     * @type {string}
     */
    this.title = title;
  }
}

exports.DashboardResponse = DashboardResponse;

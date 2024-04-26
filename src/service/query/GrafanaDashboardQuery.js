class GrafanaDashboardQuery {
  constructor() {
    /**
     * @type {number}
     */
    this.width = parseInt(process.env.HUBOT_GRAFANA_DEFAULT_WIDTH, 10) || 1000;

    /**
     * @type {number}
     */
    this.height = parseInt(process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT, 10) || 500;

    /**
     * @type {string}
     */
    this.tz = process.env.HUBOT_GRAFANA_DEFAULT_TIME_ZONE || '';

    /**
     * @type {string}
     */
    this.orgId = process.env.HUBOT_GRAFANA_ORG_ID || '';

    /**
     * @type {string}
     */
    this.apiEndpoint = process.env.HUBOT_GRAFANA_API_ENDPOINT || 'd-solo';

    /**
     * @type {boolean}
     */
    this.kiosk = false;
  }
}

exports.GrafanaDashboardQuery = GrafanaDashboardQuery;

const { GrafanaDashboardQuery } = require('./GrafanaDashboardQuery');

class GrafanaDashboardRequest {
  constructor() {
    /**
     * @type {string}
     */
    this.uid = null;

    /**
     * @type {string}
     */
    this.panel = null;

    /**
     * @type {{from: string, to: string}}
     */
    this.timespan = {
      from: `now-${process.env.HUBOT_GRAFANA_QUERY_TIME_RANGE || '6h'}`,
      to: 'now',
    };

    /**
     * @type {string}
     */
    this.variables = '';

    /**
     * @type {boolean}
     */
    this.visualPanelId = false;

    /**
     * @type {boolean}
     */
    this.apiPanelId = false;

    /**
     * @type {boolean}
     */
    this.pname = false;

    /**
     * @type {GrafanaDashboardQuery}
     */
    this.query = new GrafanaDashboardQuery();

    /**
     * @type {Array<string>}
     */
    this.template_params = [];

    /**
     * @type {Array<string>}
     */
    this.template_map = [];
  }
}

exports.GrafanaDashboardRequest = GrafanaDashboardRequest;

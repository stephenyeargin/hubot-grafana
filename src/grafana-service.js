const { GrafanaClient } = require("./grafana-client");

class GrafanaDashboardQuery {
  constructor() {


    this.width = parseInt(process.env.HUBOT_GRAFANA_DEFAULT_WIDTH) || 1000,
      this.height = parseInt(process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT) || 500,
      this.tz = process.env.HUBOT_GRAFANA_DEFAULT_TIME_ZONE || '',
      this.orgId = process.env.HUBOT_GRAFANA_ORG_ID || '',
      this.apiEndpoint = process.env.HUBOT_GRAFANA_API_ENDPOINT || 'd-solo',
      this.kiosk = false
  }
}

class GrafanaDashboardRequest{
  constructor(){
    this.query = new GrafanaDashboardQuery();
  }
}


class GrafanService {
  /**
   * Represents a Grafana service.
   * @constructor
   * @param {GrafanaClient} client - The client object used for communication with Grafana.
   */
  constructor(client) {

    /**
     * The client.
     * @type {GrafanaClient}
     */
    this.client = client;

    /**
     * The logger.
     * @type {Hubot.Log}
     */
    this.logger = client.logger;
  }

  /**
   * Retrieves a dashboard from Grafana based on the provided UID.
   * @param {string} uid - The UID of the dashboard to retrieve.
   * @returns {Promise<Object|null>} - A promise that resolves to the retrieved dashboard object, or null if the dashboard is not found or an error occurs.
   */
  async getDashboard(uid) {
    const url = `dashboards/uid/${uid}`;
    let dashboard = null;
    try {
      dashboard = await this.client.get(url);
    }
    catch (err) {
      this.logger.error(err, 'Error while getting dashboard on URL: ' + url);
      return null;
    }

    this.logger.debug(dashboard);

    // check if we can improve the error message
    if (dashboard && dashboard.message === 'Dashboard not found') {
      const dashboards = await this.client.get('search?type=dash-db');
      for (const item of Array.from(dashboards)) {
        if (item.url.match(new RegExp(`\/d\/[a-z0-9\-]+\/${uid}$`, 'i'))) {
          dashboard.message = `Try your query again with \`${item.uid}\` instead of \`${uid}\``;
          break;
        }
      }
    }

    // Handle refactor done for version 5.0.0+
    if (dashboard && dashboard.dashboard && dashboard.dashboard.panels) {
      // Concept of "rows" was replaced by coordinate system
      dashboard.dashboard.rows = [dashboard.dashboard];
    }

    return dashboard;
  }

  /**
   * Searches for dashboards based on the provided query.
   *
   * @param {string?} query - The search query.
   * @param {string?} tag - The tag.
   * @returns {Promise<Array<{uid: string, title: string}>|null>} - A promise that resolves into dashboards.
   */
  async search(query, tag) {

    const search = new URLSearchParams();
    search.append('type', 'dash-db');
    if (query) {
      this.logger.debug(query);
      search.append('query', query);
    }
    if (tag) {
      this.logger.debug(tag);
      search.append('tag', tag);
    }

    const url = `search?${search.toString()}`;

    try {
      let result = await this.client.get(url);
      return result;
    }
    catch {
      let errorTitle = query ? 'Error while searching dashboards' : 'Error while listing dashboards';
      errorTitle += ", URL: " + url;
      this.robot.logger.error(err, errorTitle)
      return null;
    }
  }

  /**
   * 
   * @param {string} state
   * @returns {Promise<Array<{ name: string, id: number, state: string, newStateDate?: string, executionError?: string >|null}>} 
   */
  async queryAlerts(state) {
    let url = 'alerts';
    if (state) {
      url = `alerts?state=${state}`;
    }
    try {
      let result = await this.client.get(url);
      return result;
    }
    catch (err) {
      robot.logger.error(err, 'Error while getting alerts on URL: ' + url);
      return null;
    }
  }

  /**
   * Pauses or resumes a single alert.
   *
   * @param {string} alertId - The ID of the alert to pause or resume.
   * @param {boolean} paused - Indicates whether to pause or resume the alert.
   * @returns {Promise<string|null>} - The result message if successful, or null if an error occurred.
   */
  async pauseSingleAlert(alertId, paused) {

    const url = `alerts/${alertId}/pause`;

    try {
      const result = await this.client.post(url, { paused });
      this.logger.debug(result);
      return result.message;
    }
    catch (err) {
      this.logger.error(err, 'Error for URL: ' + url);
      return null;
    }
  }

  /**
   * Pauses alerts in Grafana.
   *
   * @param {boolean} paused - Indicates whether to pause or resume the alerts.
   * @returns {Promise<{total: number, errored: number, success:number}} - An object containing the total number of alerts, the number of alerts that were successfully paused/resumed, and the number of alerts that encountered an error.
   */
  async pauseAllAlerts(paused) {

    const result = {
      total: 0,
      errored: 0,
      success: 0
    }

    const alerts = await this.client.get('alerts');
    if (alerts == null || alerts.length == 0) {
      return result;
    }

    result.total = alerts.length;

    for (const alert of Array.from(alerts)) {
      const url = `alerts/${alert.id}/pause`;
      try {
        await client.post(url, { paused });
        result.success++;
      } catch (err) {
        this.logger.error(err, 'Error for URL: ' + url);
        result.errored++;
      }
    }

    return result;
  }


}

module.exports = {
  GrafanService,
  GrafanaDashboardQuery
}
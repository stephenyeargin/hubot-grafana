const { GrafanaClient } = require("./grafana-client");


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
  GrafanService
}
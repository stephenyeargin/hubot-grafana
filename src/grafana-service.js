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
      this.client.logger.debug(result);
      return result.message;
    }
    catch (err) {
      this.client.logger.error(err, 'Error for URL: ' + url);
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
        this.client.logger.error(err, 'Error for URL: ' + url);
        result.errored++;
      }
    }

    return result;
  }


}

module.exports = {
  GrafanService
}
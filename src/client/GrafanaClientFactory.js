const { GrafanaClient } = require('./GrafanaClient');
const { sendError, getRoom } = require('../common');

class GrafanaClientFactory {
  constructor() {
    /** @type {string} */
    this.grafana_host = process.env.HUBOT_GRAFANA_HOST;
    /** @type {string} */
    this.grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY;
    /** @type {string} */
    this.grafana_per_room = process.env.HUBOT_GRAFANA_PER_ROOM;
  }

  /**
   * Creates a Grafana client based on the provided response.
   *
   * @param {Hubot.Response} res the context.
   * @param {string?} host the host. If no host is provided, the one from the environment will be taken.
   * @param {string?} apiKey the api key. If no apiKey is provided, the one from the environment will be taken.
   * @returns {GrafanaClient|null} - The created Grafana client instance, or null if no Grafana endpoint is configured.
   */
  createByResponse(res, host, apiKey) {
    const robot = res.robot;

    if (this.grafana_per_room === '1') {
      const room = getRoom(res);
      host = robot.brain.get(`grafana_host_${room}`);
      apiKey = robot.brain.get(`grafana_api_key_${room}`);

      if (host == null) {
        sendError('No Grafana endpoint configured.', res);
        return null;
      }
    }

    return this.createByRobot(robot, host, apiKey);
  }

  /**
   * Create a new instance of GrafanaClient using the Hubot Robot.
   * @param {Hubot.Robot} robot the logger.
   * @param {string?} host the host. If no host is provided, the one from the environment will be taken.
   * @param {string?} apiKey the api key. If no apiKey is provided, the one from the environment will be taken.
   * @returns {GrafanaClient|null} - The created Grafana client instance, or null if no Grafana endpoint is configured.
   */
  createByRobot(robot, host, apiKey) {
    return this.create(robot.http, robot.logger, host, apiKey);
  }

  /**
   * Create a new instance of GrafanaClient.
   * @param {(url: string, options?: HttpOptions)=>ScopedClient} http the HTTP client.
   * @param {Hubot.Log} logger the logger.
   * @param {string?} host the host. If no host is provided, the one from the environment will be taken.
   * @param {string?} apiKey the api key. If no apiKey is provided, the one from the environment will be taken.
   * @returns {GrafanaClient|null} - The created Grafana client instance, or null if no Grafana endpoint is configured.
   */
  create(http, logger, host, apiKey) {
    host = host || this.grafana_host;
    apiKey = apiKey || this.grafana_api_key;

    if (host == null) {
      sendError('No Grafana endpoint configured.', res);
      return null;
    }

    let grafana = new GrafanaClient(http, logger, host, apiKey);
    return grafana;
  }
}

exports.GrafanaClientFactory = GrafanaClientFactory;

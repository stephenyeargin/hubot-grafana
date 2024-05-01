const { Adapter } = require('./adapters/Adapter');
const { GrafanaService } = require('./service/GrafanaService');
const { GrafanaClient } = require('./grafana-client');

/**
 * The bot brings the Adapter and the Grafana Service together.
 * It can be used for uploading charts and sending responses out.
 */
class Bot {
  /**
   * Represents the Bot class.
   * @constructor
   * @param {Hubot.Robot} robot - The robot instance.
   */
  constructor(robot) {
    /** @type {Adapter} */
    this.adapter = new Adapter(robot);

    /** @type {Hubot.Log} */
    this.logger = robot.logger;
  }

  /**
   * Creates a new Grafana service based on the provided message.
   * @param {Hubot.Response} context - The context object.
   * @returns {GrafanaService|null} - The created Grafana service or null if the client is not available.
   */
  createService(context) {

    const robot = context.robot;
    let host = process.env.HUBOT_GRAFANA_HOST;
    let apiKey = process.env.HUBOT_GRAFANA_API_KEY;

    if (process.env.HUBOT_GRAFANA_PER_ROOM === '1') {
      const room = this.getRoom(context);
      host = robot.brain.get(`grafana_host_${room}`);
      apiKey = robot.brain.get(`grafana_api_key_${room}`);
    }

    if (host == null) {
      this.sendError('No Grafana endpoint configured.', context);
      return null;
    }

    let client = new GrafanaClient(robot.logger, host, apiKey);
    return new GrafanaService(client);
  }

  /**
   * Sends dashboard charts based on a request string.
   *
   * @param {Hubot.Response} context - The context object.
   * @param {string} requestString - The request string. This string may contain all the parameters to fetch a dashboard (should not contain the `@hubot graf db` part).
   * @param {number} maxReturnDashboards - The maximum number of dashboards to return.
   * @returns {Promise<void>} - A promise that resolves when the charts are sent.
   */
  async sendDashboardChartFromString(context, requestString, maxReturnDashboards = null) {
    const service = this.createService(context);
    if (service == null) return;

    const req = service.parseToGrafanaDashboardRequest(requestString);
    const dashboard = await service.getDashboard(req.uid);

    // Check dashboard information
    if (!dashboard) {
      return this.sendError('An error ocurred. Check your logs for more details.', context);
    }

    if (dashboard.message) {
      return this.sendError(dashboard.message, context);
    }

    // Defaults
    const data = dashboard.dashboard;

    // Handle empty dashboard
    if (data.rows == null) {
      return this.sendError('Dashboard empty.', context);
    }

    maxReturnDashboards = maxReturnDashboards || parseInt(process.env.HUBOT_GRAFANA_MAX_RETURNED_DASHBOARDS, 10) || 25;
    const charts = await service.getDashboardCharts(req, dashboard, maxReturnDashboards);
    if (charts == null || charts.length === 0) {
      return this.sendError('Could not locate desired panel.', context);
    }

    for (let chart of charts) {
      await this.sendDashboardChart(context, chart);
    }
  }

  /**
   * Sends a dashboard chart.
   *
   * @param {Hubot.Response} context - The context object.
   * @param {DashboardChart} dashboard - The dashboard object.
   * @returns {Promise<void>} - A promise that resolves when the chart is sent.
   */
  async sendDashboardChart(context, dashboard) {
    if (!this.adapter.isUploadSupported()) {
      this.adapter.responder.send(context, dashboard.title, dashboard.imageUrl, dashboard.grafanaChartLink);
      return;
    }

    const service = this.createService(context);
    if (service == null) return;

    /** @type {DownloadedFile|null} */
    let file = null;

    try {
      file = await service.client.download(dashboard.imageUrl);
    } catch (err) {
      this.sendError(err, context);
      return;
    }

    this.logger.debug(`Uploading file: ${file.body.length} bytes, content-type[${file.contentType}]`);
    this.adapter.uploader.upload(context, dashboard.title || 'Image', file, dashboard.grafanaChartLink);
  }

  /**
   * *Sends an error message.
   * @param {string} message the error message.
   * @param {Hubot.Response} context The context.
   */
  sendError(message, context) {
    context.robot.logger.error(message);
    context.send(message);
  }

  /**
   * Gets the room from the context.
   * @param {Hubot.Response} context The context.
   * @returns {string}
   */
  getRoom(context) {
    // placeholder for further adapter support (i.e. MS Teams) as then room also
    // contains thread conversation id
    return context.envelope.room;
  }
}

exports.Bot = Bot;

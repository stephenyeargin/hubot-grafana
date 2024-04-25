const { Adapter } = require('./adapters/Adapter');
const { GrafanaService } = require('./service/GrafanaService');
const { GrafanaClient } = require('./GrafanaClient');

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

    let client = new GrafanaClient(robot.http, robot.logger, host, apiKey);
    return new GrafanaService(client);
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

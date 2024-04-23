const { Adapter } = require('./adapters/Adapter');
const { GrafanaClientFactory } = require('./client/GrafanaClientFactory');
const { GrafanaService } = require('./service/GrafanaService');

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
    this.adapter = new Adapter(robot);
    this.clientFactory = new GrafanaClientFactory();
    this.logger = robot.logger;
  }

  /**
   * Creates a new Grafana service based on the provided message.
   * @param {Hubot.Response} context - The context object.
   * @returns {GrafanaService|null} - The created Grafana service or null if the client is not available.
   */
  createService(context) {
    const client = this.clientFactory.createByResponse(context);
    if (!client) return null;
    return new GrafanaService(client);
  }

  async sendDashboardChart(res, dashboard) {
    if (!this.adapter.isUploadSupported()) {
      this.adapter.responder.send(res, dashboard.title, dashboard.imageUrl, dashboard.grafanaChartLink);
      return;
    }

    const client = this.clientFactory.createByResponse(res);
    if (!client) return;

    let file = null;

    try {
      file = await client.download(dashboard.imageUrl);
    } catch (err) {
      sendError(err, res);
      return;
    }

    this.logger.debug(`Uploading file: ${file.body.length} bytes, content-type[${file.contentType}]`);
    this.adapter.uploader.upload(res, dashboard.title || 'Image', file, dashboard.grafanaChartLink);
  }
}

exports.Bot = Bot;

'strict';

const { ScopedClient } = require('scoped-http-client');

class GrafanaClient {
  /**
   * Creates a new instance.
   * @param {Hubot.Response} res the context.
   */
  constructor(res) {
    /**
     * The context
     * @type {Hubot.Response}
     */
    this.res = res;

    // Various configuration options stored in environment variables
    this.grafana_host = process.env.HUBOT_GRAFANA_HOST;
    this.grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY;
    this.grafana_per_room = process.env.HUBOT_GRAFANA_PER_ROOM;

    /**
     * The endpoint, determined by the context.
     * @type { { host: string, api_key: string } | null }
     */
    this.endpoint = this.get_grafana_endpoint();

    /**
     * The logger.
     * @type {Hubot.Log}
     */
    this.logger = res.logger;
  }

  /**
   * Performs a GET call to the Grafana API.
   *
   * @param {Hubot.Response} res the Hubot context for which Grafana will be called.
   * @param {string} url The API sub URL
   * @param {(Record<string, any> | false)=>void} callback The callback.
   * @returns
   *
   * TODO: figure out return type
   */
  call(url, callback) {
    if (!this.endpoint) {
      this.sendError('No Grafana endpoint configured.');
      return;
    }

    this.res
      .http(`${this.endpoint.host}/api/${url}`) // TODO: should we use robot.http or just fetch
      .headers(grafanaHeaders(this.endpoint))
      .get()((err, res, body) => {
      if (err) {
        this.logger.error(err);
        return callback(false);
      }
      const data = JSON.parse(body);
      return callback(data);
    });
  }

  /**
   * Performs a GET on the Grafana API.
   * Remarks: uses Hubot because of Nock testing.
   * @param {Hubot.Response} res the context.
   * @param {string} url the url
   * @returns {Promise<any>}
   */
  async get(url) {
    if (!this.endpoint) {
      throw new Error('No Grafana endpoint configured.');
    }

    const fullUrl = `${this.endpoint.host}/api/${url}`;
    const headers = grafanaHeaders(this.endpoint);

    return new Promise((done) => {
      this.res.http(fullUrl).headers(headers).get()((err, res, body) => {
        if (err) {
          throw err;
        }
        const data = JSON.parse(body);
        return done(data);
      });
    });
  }

  /**
   * Performs a POST call to the Grafana API.
   *
   * @param {Hubot.Response} res the Hubot context for which Grafana will be called.
   * @param {string} url The API sub URL
   * @param {Record<string, any>} data The data that will be sent.
   * @param {(success: boolean, Record<string, any>)=>void} callback The callback.
   * @returns
   * TODO: figure out return type
   */
  post(url, data, callback) {
    if (!this.endpoint) {
      this.sendError('No Grafana endpoint configured.');
      return;
    }

    const jsonPayload = JSON.stringify(data);
    return this.res
      .http(`${this.endpoint.host}/api/${url}`) // TODO: should we use robot.http or just fetch
      .headers(grafanaHeaders(this.endpoint, true))
      .post(jsonPayload)((err, res, body) => {
      if (err) {
        this.logger.error(err);
        return callback(false);
      }
      data = JSON.parse(body);
      return callback(data);
    });
  }

  /**
   * Gets the Grafana endpoints. If grafana_per_room is set to 1, the endpoints will
   * be configured from by the context.
   * @returns { { host: string, api_key: string } | null }
   */
  get_grafana_endpoint() {
    let grafana_api_key = this.grafana_api_key;
    let grafana_host = this.grafana_host;

    if (this.grafana_per_room === '1') {
      const room = get_room(this.res);
      grafana_host = this.res.brain.get(`grafana_host_${room}`);
      grafana_api_key = this.res.brain.get(`grafana_api_key_${room}`);
    }

    //TODO: this was only part of the grafana_per_room, but it
    //seems that it is OK never to continue without a grafana_host
    if (!grafana_host) {
      return null;
    }

    return { host: grafana_host, api_key: grafana_api_key };
  }

  /**
   *
   * @param {string} message the message containing the error.
   */
  sendError(message) {
    this.logger.error(message);
    this.res.send(message);
  }

  hasValidEndpoint() {
    return this.endpoint != null;
  }
}

function grafanaHeaders(endpoint, post = false) {
  const headers = { Accept: 'application/json' };
  if (endpoint.api_key) {
    headers.Authorization = `Bearer ${endpoint.api_key}`;
  }
  if (post) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/**
 * Gets the room from the context.
 * @param {Hubot.Response} res The context.
 * @returns {string}
 */
function get_room(res) {
  // placeholder for further adapter support (i.e. MS Teams) as then room also
  // contains thread conversation id
  return res.envelope.room;
}

module.exports = {
  GrafanaClient,
};

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
   * Creates a scoped HTTP client.
   * @param {string} url The URL.
   * @param {boolean} isPost Indicates if the HTTP client should post.
   * @returns {ScopedClient}
   */
  createHttpClient(url, isPost = false, isDownload = false) {
    // TODO: should we use robot.http or just fetch
    // currently we cannot switch because of nock testing

    // in case of a download we get a "full" URL
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${this.endpoint.host}/api/${url}`;
    const headers = grafanaHeaders(this.endpoint, isPost, isDownload);
    const client = this.res.http(fullUrl).headers(headers);

    return client;
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

    let client = this.createHttpClient(url);
    return new Promise((resolve) => {
      client.get()((err, res, body) => {
        if (err) {
          throw err;
        }
        const data = JSON.parse(body);

        return resolve(data);
      });
    });
  }

  /**
   * Performs a POST call to the Grafana API.
   *
   * @param {Hubot.Response} res the Hubot context for which Grafana will be called.
   * @param {string} url The API sub URL
   * @param {Record<string, any>} data The data that will be sent.
   * @returns {Promise<any>}
   * TODO: figure out return type
   */
  post(url, data) {
    if (!this.endpoint) {
      throw new Error('No Grafana endpoint configured.');
    }

    const jsonPayload = JSON.stringify(data);
    const http = this.createHttpClient(url, true);

    return new Promise((resolve, reject) => {
      http.post(jsonPayload)((err, res, body) => {
        if (err) {
          reject(err);
          return;
        }

        data = JSON.parse(body);
        resolve(data);
      });
    });
  }

  /**
   * Downloads the given URL.
   * @param {string} url The URL.
   * @returns {{ body: Buffer, contentType: string}}
   */
  async download(url) {
    let client = this.createHttpClient(url, false, true);

    return new Promise((resolve, reject) => {
      client.get()((err, res, body) => {
        if (err) {
          reject(err);
          return;
        }

        this.logger.debug(`Uploading file: ${body.length} bytes, content-type[${res.headers['content-type']}]`);

        resolve({
          body,
          contentType: res.headers['content-type'],
        });
      });
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
}

function grafanaHeaders(endpoint, isPost = false, isDownload = false) {
  const headers = { Accept: 'application/json' };
  if (endpoint.api_key) {
    headers.Authorization = `Bearer ${endpoint.api_key}`;
  }
  if (isPost) {
    headers['Content-Type'] = 'application/json';
  }
  if (isDownload) {
    headers['encoding'] = null;
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

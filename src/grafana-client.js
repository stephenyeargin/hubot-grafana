'strict';

const { ScopedClient } = require('scoped-http-client');

class GrafanaClient {
  /**
   * Creates a new instance.
   * @param {(url: string, options?: HttpOptions)=>ScopedClient} http the HTTP client.
   * @param {Hubot.Log} res the logger.
   * @param {string} grafana_host the host.
   * @param {string} grafana_api_key the api key.
   */
  constructor(http, logger, grafana_host, grafana_api_key) {
    /**
     * The context
     * @type {(url: string, options?: HttpOptions)=>ScopedClient}
     */
    this.http = http;

    /**
     * The logger.
     * @type {Hubot.Log}
     */
    this.logger = logger;

    /**
     * The host.
     * @type {string | null}
     */
    this.grafana_host = grafana_host;

    /**
     * The API key.
     * @type {string | null}
     */
    this.grafana_api_key = grafana_api_key;
  }

  /**
   * Creates a scoped HTTP client.
   * @param {string} url The URL.
   * @param {string | null} contentType Indicates if the HTTP client should post.
   * @param {encoding | false} encoding Incidates if an encoding should be set.
   * @returns {ScopedClient}
   */
  createHttpClient(url, contentType = null, encoding = false) {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !this.grafana_host) {
      throw new Error('No Grafana endpoint configured.');
    }

    // TODO: should we use robot.http or just fetch
    // currently we cannot switch because of nock testing

    // in case of a download we get a "full" URL
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${this.grafana_host}/api/${url}`;
    const headers = grafanaHeaders(contentType, encoding, this.grafana_api_key);
    const client = this.http(fullUrl).headers(headers);

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
    const http = this.createHttpClient(url, 'application/json');
    const jsonPayload = JSON.stringify(data);

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
    let client = this.createHttpClient(url, null, null);

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
}

/**
 * Create headers for the fr
 * @param {string | null} contentType Indicates if the HTTP client should post.
 * @param {string | false} encoding Incidates if an encoding should be set.
 * @param {string | null} api_key The API key.
 * @returns
 */
function grafanaHeaders(contentType, encoding, api_key) {
  const headers = { Accept: 'application/json' };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  // download needs a null encoding
  // TODO: are we sure?
  if (encoding !== false) {
    headers['encoding'] = encoding;
  }

  if (api_key) {
    headers.Authorization = `Bearer ${api_key}`;
  }

  return headers;
}

module.exports = {
  GrafanaClient,
};

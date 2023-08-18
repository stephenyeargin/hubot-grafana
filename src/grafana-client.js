'strict';
const fetch = require('node-fetch');

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
     * The HTTP client
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
   * @param {encoding | false} encoding Indicates if an encoding should be set.
   * @returns {ScopedClient}
   */
  createHttpClient(url, contentType = null, encoding = false) {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !this.grafana_host) {
      throw new Error('No Grafana endpoint configured.');
    }

    // in case of a download we get a "full" URL
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${this.grafana_host}/api/${url}`;
    const headers = grafanaHeaders(contentType, encoding, this.grafana_api_key);
    const client = this.http(fullUrl).headers(headers);

    return client;
  }

  /**
   * Performs a GET on the Grafana API.
   * Remarks: uses Hubot because of Nock testing.
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
   * @param {string} url The API sub URL
   * @param {Record<string, any>} data The data that will be sent.
   * @returns {Promise<any>}
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
   * @returns {Promise<{ body: Buffer, contentType: string}>}
   */
  async download(url) {
    return await fetch(url, {
      method: 'GET',
      headers: grafanaHeaders(null, null),
    }).then(async (res) => {
      const contentType = res.headers.get('content-type');
      const body = await res.arrayBuffer();

      return {
        body: Buffer.from(body),
        contentType: contentType,
      };
    });
  }
}

/**
 * Create headers for the Grafana request.
 * @param {string | null} contentType Indicates if the HTTP client should post.
 * @param {string | false} encoding Indicates if an encoding should be set.
 * @param {string | null} api_key The API key.
 * @returns {Record<string, string|null>}
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

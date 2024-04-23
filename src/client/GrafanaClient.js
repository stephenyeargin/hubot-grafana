/// <reference path="../../types.d.ts"/>

const fetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');

class GrafanaClient {
  /**
   * Creates a new instance.
   * @param {(url: string, options?: HttpOptions)=>ScopedClient} http the HTTP client.
   * @param {Hubot.Log} logger the logger.
   * @param {string} host the host.
   * @param {string} apiKey the api key.
   */
  constructor(http, logger, host, apiKey) {
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
    this.host = host;

    /**
     * The API key.
     * @type {string | null}
     */
    this.apiKey = apiKey;
  }

  /**
   * Creates a scoped HTTP client.
   * @param {string} url The URL.
   * @param {string | null} contentType Indicates if the HTTP client should post.
   * @param {encoding | false} encoding Indicates if an encoding should be set.
   * @returns {ScopedClient}
   */
  createHttpClient(url, contentType = null, encoding = false) {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !this.host) {
      throw new Error('No Grafana endpoint configured.');
    }

    // in case of a download we get a "full" URL
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${this.host}/api/${url}`;
    const headers = grafanaHeaders(contentType, encoding, this.apiKey);
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
   * @returns {Promise<DownloadedFile>}
   */
  async download(url) {
    return await fetch(url, {
      method: 'GET',
      headers: grafanaHeaders(null, null, this.apiKey),
    }).then(async (res) => {
      const contentType = res.headers.get('content-type');
      const body = await res.arrayBuffer();

      return {
        body: Buffer.from(body),
        contentType: contentType,
      };
    });
  }

  createGrafanaChartLink(query, uid, panel, timespan, variables) {
    const url = new URL(`${this.host}/d/${uid}/`);

    if (panel) {
      url.searchParams.set('panelId', panel.id);
      url.searchParams.set('fullscreen', '');
    }

    url.searchParams.set('from', timespan.from);
    url.searchParams.set('to', timespan.to);

    if (variables) {
      const additionalParams = new URLSearchParams(variables);
      for (const [key, value] of additionalParams) {
        url.searchParams.append(key, value);
      }
    }

    // TODO: should we add these?
    // if (query.tz) {
    //   url.searchParams.set('tz', query.tz);
    // }
    // if (query.orgId) {
    //   url.searchParams.set('orgId', query.orgId);
    // }

    return url.toString().replace('fullscreen=&', 'fullscreen&');
  }

  createImageUrl(query, uid, panel, timespan, variables) {
    const url = new URL(`${this.host}/render/${query.apiEndpoint}/${uid}/`);

    if (panel) {
      url.searchParams.set('panelId', panel.id);
    } else if (query.kiosk) {
      url.searchParams.set('kiosk', '');
      url.searchParams.set('autofitpanels', '');
    }

    url.searchParams.set('width', query.width);
    url.searchParams.set('height', query.height);
    url.searchParams.set('from', timespan.from);
    url.searchParams.set('to', timespan.to);

    if (variables) {
      const additionalParams = new URLSearchParams(variables);
      for (const [key, value] of additionalParams) {
        url.searchParams.append(key, value);
      }
    }

    if (query.tz) {
      url.searchParams.set('tz', query.tz);
    }

    //TODO: currently not tested
    if (query.orgId) {
      url.searchParams.set('orgId', query.orgId);
    }

    return url.toString().replace('kiosk=&', 'kiosk&').replace('autofitpanels=&', 'autofitpanels&');
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

exports.GrafanaClient = GrafanaClient;
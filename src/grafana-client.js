'strict';
const fetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');

/// <reference path="../types.d.ts"/>

  /**
   * If the given url does not have a host, it will add it to the
   * url and return it.
   * @param {string} url the url
   * @returns {string} the expanded URL.
   */
function expandUrl(url, host) {

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (!host) {
    throw new Error('No Grafana endpoint configured.');
  }

  let apiUrl = host;
  if (!apiUrl.endsWith('/')) {
    apiUrl += '/';
  }

  apiUrl += 'api/';
  apiUrl += url;

  return apiUrl;
}

class GrafanaClient {
  /**
   * Creates a new instance.
   * @param {Hubot.Log} logger the logger.
   * @param {string} host the host.
   * @param {string} apiKey the api key.
   */
  constructor(logger, host, apiKey) {
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
   * Performs a GET on the Grafana API.
   * Remarks: uses Hubot because of Nock testing.
   * @param {string} url the url
   * @returns {Promise<unknown>} the response data
   */
  async get(url) {
    const fullUrl = expandUrl(url, this.host);
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: grafanaHeaders(null, false, this.apiKey),
    });

    await this.throwIfNotOk(response);

    const json = await response.json();
    return json;
  }

  /**
   * Performs a POST call to the Grafana API.
   *
   * @param {string} url The API sub URL
   * @param {Record<string, unknown>} data The data that will be sent.
   * @returns {Promise<unknown>}
   */
  async post(url, data) {
    const fullUrl = expandUrl(url, this.host);
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: grafanaHeaders('application/json', false, this.apiKey),
      body: JSON.stringify(data),
    });

    await this.throwIfNotOk(response);

    const json = await response.json();
    return json;
  }

  /**
   * Ensures that the response is OK. If the response is not OK, an error is thrown.
   * @param {fetch.Response} response - The response object.
   * @throws {Error} If the response is not OK, an error with the response text is thrown.
   */
  async throwIfNotOk(response) {
    if (response.ok) {
      return;
    }

    let contentType = null;
    if (response.headers.has('content-type')) {
      contentType = response.headers.get('content-type');
      if (contentType.includes(';')) {
        contentType = contentType.split(';')[0];
      }
    }

    if (contentType == 'application/json') {
      const json = await response.json();
      const error = new Error(json.message || 'Error while fetching data from Grafana.');
      error.data = json;
      throw error;
    }

    let error = new Error('Error while fetching data from Grafana.');
    if (contentType != 'text/html') {
      error.data = await response.text();
    }

    throw error;
  }

  /**
   * Downloads the given URL.
   * @param {string} url The URL.
   * @returns {Promise<DownloadedFile>}
   */
  async download(url) {
    let response = await fetch(url, {
      method: 'GET',
      headers: grafanaHeaders(null, null, this.apiKey),
    });

    await this.throwIfNotOk(response);

    const contentType = response.headers.get('content-type');
    const body = await response.arrayBuffer();

    return {
      body: Buffer.from(body),
      contentType: contentType,
    };
  }

  createGrafanaChartLink(query, uid, panel, timeSpan, variables) {
    const url = new URL(`${this.host}/d/${uid}/`);

    if (panel) {
      url.searchParams.set('panelId', panel.id);
      url.searchParams.set('fullscreen', '');
    }

    url.searchParams.set('from', timeSpan.from);
    url.searchParams.set('to', timeSpan.to);

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

  createImageUrl(query, uid, panel, timeSpan, variables) {
    const url = new URL(`${this.host}/render/${query.apiEndpoint}/${uid}/`);

    if (panel) {
      url.searchParams.set('panelId', panel.id);
    } else if (query.kiosk) {
      url.searchParams.set('kiosk', '');
      url.searchParams.set('autofitpanels', '');
    }

    url.searchParams.set('width', query.width);
    url.searchParams.set('height', query.height);
    url.searchParams.set('from', timeSpan.from);
    url.searchParams.set('to', timeSpan.to);

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

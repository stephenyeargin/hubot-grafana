const { GrafanaDashboardRequest } = require('./query/GrafanaDashboardRequest');
const { DashboardResponse } = require('./query/DashboardResponse');
const { GrafanaClient } = require('../client/GrafanaClient');

class GrafanaService {
  /**
   * Represents a Grafana service.
   * @constructor
   * @param {GrafanaClient} client - The client object used for communication with Grafana.
   */
  constructor(client) {
    /**
     * The client.
     * @type {GrafanaClient}
     */
    this.client = client;

    /**
     * The logger.
     * @type {Hubot.Log}
     */
    this.logger = client.logger;
  }

  /**
   * Parses a string into a GrafanaDashboardRequest object.
   * @param {string} str - The string to parse.
   * @returns {GrafanaDashboardRequest|null} - The parsed GrafanaDashboardRequest object, or null if the string cannot be parsed.
   */
  parseToGrafanaDashboardRequest(str) {
    const match = str.match(/([A-Za-z0-9\-\:_]+)(.*)/);
    if (!match) return null;

    const request = new GrafanaDashboardRequest();
    request.uid = match[1].trim();

    // Parse out a specific panel
    if (/\:/.test(request.uid)) {
      let parts = request.uid.split(':');
      request.uid = parts[0];
      request.visualPanelId = parseInt(parts[1], 10);
      if (Number.isNaN(request.visualPanelId)) {
        request.visualPanelId = false;
        request.pname = parts[1].toLowerCase();
      }
      if (/panel-[0-9]+/.test(request.pname)) {
        parts = request.pname.split('panel-');
        request.apiPanelId = parseInt(parts[1], 10);
        request.pname = false;
      }
    }

    const remainder = match[2] ? match[2].trim() : '';

    // Check if we have any extra fields
    if (remainder !== '') {
      // The order we apply non-variables in
      const timeFields = ['from', 'to'];

      for (const part of Array.from(remainder.trim().split(' '))) {
        // Check if it's a variable or part of the timespan

        if (part.indexOf('=') >= 0) {
          // put query stuff into its own dict
          const [partName, partValue] = part.split('=');

          if (partName in request.query) {
            request.query[partName] = partValue;
            continue;
          } else if (partName == 'from') {
            request.timespan.from = partValue;
            continue;
          } else if (partName == 'to') {
            request.timespan.to = partValue;
            continue;
          }

          request.variables = `${request.variables}&var-${part}`;
          request.template_params.push({
            name: partName,
            value: partValue,
          });
        } else if (part == 'kiosk') {
          request.query.kiosk = true;
        }
        // Only add to the timespan if we haven't already filled out from and to
        else if (timeFields.length > 0) {
          request.timespan[timeFields.shift()] = part.trim();
        }
      }
    }

    this.logger.debug(str);
    this.logger.debug(request.uid);
    this.logger.debug(request.timespan);
    this.logger.debug(request.variables);
    this.logger.debug(request.template_params);
    this.logger.debug(request.visualPanelId);
    this.logger.debug(request.apiPanelId);
    this.logger.debug(request.pname);

    return request;
  }

  /**
   * Retrieves the screenshot URLs for the specified dashboard.
   *
   * @param {GrafanaDashboardRequest} req - The request object.
   * @param {Object} dashboard - The dashboard object.
   * @param {number} max_return_dashboards - The maximum number of dashboards to return.
   * @returns {Array<DashboardResponse>} An array of DashboardResponse objects containing the screenshot URLs.
   */
  async getScreenshotUrls(req, dashboard, max_return_dashboards) {
    if (dashboard == null || dashboard.message) return null;

    dashboard = dashboard.dashboard;

    if (req.query.kiosk) {
      req.query.apiEndpoint = 'd';
      const imageUrl = await this.client.createImageUrl(req.query, req.uid, null, req.timespan, req.variables);
      const grafanaChartLink = await this.client.createGrafanaChartLink(
        req.query,
        req.uid,
        null,
        req.timespan,
        req.variables
      );
      const title = dashboard.title;

      const response = new DashboardResponse(imageUrl, grafanaChartLink, title);
      return [response];
    }

    // Support for templated dashboards
    let templateMap = null;
    this.logger.debug(dashboard.templating.list);
    if (dashboard.templating.list) {
      templateMap = [];
      for (const template of Array.from(dashboard.templating.list)) {
        this.logger.debug(template);
        if (!template.current) {
          continue;
        }
        for (const p of req.template_map) {
          if (template.name === p.name) {
            templateMap[`$${template.name}`] = p.value;
          } else {
            templateMap[`$${template.name}`] = template.current.text;
          }
        }
      }
    }

    const responses = [];

    // Return dashboard rows
    let panelNumber = 0;
    const returnedCount = 0;
    for (const row of Array.from(dashboard.rows)) {
      for (const panel of Array.from(row.panels)) {
        this.logger.debug(panel);

        panelNumber += 1;
        // Skip if visual panel ID was specified and didn't match
        if (req.visualPanelId && req.visualPanelId !== panelNumber) {
          continue;
        }

        // Skip if API panel ID was specified and didn't match
        if (req.apiPanelId && req.apiPanelId !== panel.id) {
          continue;
        }

        // Skip if panel name was specified any didn't match
        if (req.pname && panel.title.toLowerCase().indexOf(req.pname) === -1) {
          continue;
        }

        // Build links for message sending
        const title = formatTitleWithTemplate(panel.title, templateMap);
        const imageUrl = this.client.createImageUrl(req.query, req.uid, panel, req.timespan, req.variables);
        const grafanaChartLink = this.client.createGrafanaChartLink(
          req.query,
          req.uid,
          panel,
          req.timespan,
          req.variables
        );

        responses.push(new DashboardResponse(imageUrl, grafanaChartLink, title));

        // Skip if we have already returned max count of dashboards
        if (responses.length == max_return_dashboards) {
          break;
        }
      }
    }

    return responses;
  }

  /**
   * Retrieves a dashboard from Grafana based on the provided UID.
   * @param {string} uid - The UID of the dashboard to retrieve.
   * @returns {Promise<Object|null>} - A promise that resolves to the retrieved dashboard object, or null if the dashboard is not found or an error occurs.
   */
  async getDashboard(uid) {
    const url = `dashboards/uid/${uid}`;
    let dashboard = null;
    try {
      dashboard = await this.client.get(url);
    } catch (err) {
      this.logger.error(err, `Error while getting dashboard on URL: ${url}`);
      return null;
    }

    this.logger.debug(dashboard);

    // check if we can improve the error message
    if (dashboard && dashboard.message === 'Dashboard not found') {
      const dashboards = await this.client.get('search?type=dash-db');
      for (const item of Array.from(dashboards)) {
        if (item.url.match(new RegExp(`\/d\/[a-z0-9\-]+\/${uid}$`, 'i'))) {
          dashboard.message = `Try your query again with \`${item.uid}\` instead of \`${uid}\``;
          break;
        }
      }
    }

    // Handle refactor done for version 5.0.0+
    if (dashboard && dashboard.dashboard && dashboard.dashboard.panels) {
      // Concept of "rows" was replaced by coordinate system
      dashboard.dashboard.rows = [dashboard.dashboard];
    }

    return dashboard;
  }

  /**
   * Searches for dashboards based on the provided query.
   *
   * @param {string?} query - The search query.
   * @param {string?} tag - The tag.
   * @returns {Promise<Array<{uid: string, title: string}>|null>} - A promise that resolves into dashboards.
   */
  async search(query, tag) {
    const search = new URLSearchParams();
    search.append('type', 'dash-db');
    if (query) {
      this.logger.debug(query);
      search.append('query', query);
    }
    if (tag) {
      this.logger.debug(tag);
      search.append('tag', tag);
    }

    const url = `search?${search.toString()}`;

    try {
      const result = await this.client.get(url);
      return result;
    } catch {
      let errorTitle = query ? 'Error while searching dashboards' : 'Error while listing dashboards';
      errorTitle += `, URL: ${url}`;
      this.logger.error(err, errorTitle);
      return null;
    }
  }

  /**
   *
   * @param {string} state
   * @returns {Promise<Array<{ name: string, id: number, state: string, newStateDate?: string, executionError?: string >|null}>}
   */
  async queryAlerts(state) {
    let url = 'alerts';
    if (state) {
      url = `alerts?state=${state}`;
    }
    try {
      const result = await this.client.get(url);
      return result;
    } catch (err) {
      this.logger.error(err, `Error while getting alerts on URL: ${url}`);
      return null;
    }
  }

  /**
   * Pauses or resumes a single alert.
   *
   * @param {string} alertId - The ID of the alert to pause or resume.
   * @param {boolean} paused - Indicates whether to pause or resume the alert.
   * @returns {Promise<string|null>} - The result message if successful, or null if an error occurred.
   */
  async pauseSingleAlert(alertId, paused) {
    const url = `alerts/${alertId}/pause`;

    try {
      const result = await this.client.post(url, { paused });
      this.logger.debug(result);
      return result.message;
    } catch (err) {
      this.logger.error(err, `Error for URL: ${url}`);
      return null;
    }
  }

  /**
   * Pauses alerts in Grafana.
   *
   * @param {boolean} paused - Indicates whether to pause or resume the alerts.
   * @returns {Promise<{total: number, errored: number, success:number}} - An object containing the total number of alerts, the number of alerts that were successfully paused/resumed, and the number of alerts that encountered an error.
   */
  async pauseAllAlerts(paused) {
    const result = {
      total: 0,
      errored: 0,
      success: 0,
    };

    const alerts = await this.client.get('alerts');
    if (alerts == null || alerts.length == 0) {
      return result;
    }

    result.total = alerts.length;

    for (const alert of Array.from(alerts)) {
      const url = `alerts/${alert.id}/pause`;
      try {
        await this.client.post(url, { paused });
        result.success++;
      } catch (err) {
        this.logger.error(err, `Error for URL: ${url}`);
        result.errored++;
      }
    }

    return result;
  }
}

// Format the title with template vars
function formatTitleWithTemplate(title, template_map) {
  if (!title) {
    title = '';
  }
  return title.replace(/\$\w+/g, (match) => {
    if (template_map[match]) {
      return template_map[match];
    }
    return match;
  });
}

exports.GrafanaService = GrafanaService;

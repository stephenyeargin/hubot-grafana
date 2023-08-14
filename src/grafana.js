// Description:
//   Query Grafana dashboards
//
//   Examples:
//   - `hubot graf db graphite-carbon-metrics` - Get all panels in the dashboard
//   - `hubot graf db graphite-carbon-metrics:3` - Get only the third panel, from left to right, of a particular dashboard
//   - `hubot graf db graphite-carbon-metrics:3 width=1000` - Get only the third panel, from left to right, of a particular dashboard. Set the image width to 1000px
//   - `hubot graf db graphite-carbon-metrics:3 height=2000` - Get only the third panel, from left to right, of a particular dashboard. Set the image height to 2000px
//   - `hubot graf db graphite-carbon-metrics:panel-8` - Get only the panel of a particular dashboard with the ID of 8
//   - `hubot graf db graphite-carbon-metrics:cpu` - Get only the panels containing "cpu" (case insensitive) in the title
//   - `hubot graf db graphite-carbon-metrics now-12hr` - Get a dashboard with a window of 12 hours ago to now
//   - `hubot graf db graphite-carbon-metrics now-24hr now-12hr` - Get a dashboard with a window of 24 hours ago to 12 hours ago
//   - `hubot graf db graphite-carbon-metrics:3 now-8d now-1d` - Get only the third panel of a particular dashboard with a window of 8 days ago to yesterday
//   - `hubot graf db graphite-carbon-metrics:3 tz=Europe/Amsterdam` - Get only the third panel of a particular dashboard and render in the time zone Europe/Amsterdam
//
// Configuration:
//   HUBOT_GRAFANA_HOST - Host for your Grafana 2.0 install, e.g. 'https://play.grafana.org'
//   HUBOT_GRAFANA_API_KEY - API key for a particular user (leave unset if unauthenticated)
//   HUBOT_GRAFANA_PER_ROOM - Optional; if set use robot brain to store host & API key per room
//   HUBOT_GRAFANA_QUERY_TIME_RANGE - Optional; Default time range for queries (defaults to 6h)
//   HUBOT_GRAFANA_DEFAULT_WIDTH - Optional; Default width for rendered images (defaults to 1000)
//   HUBOT_GRAFANA_DEFAULT_HEIGHT - Optional; Default height for rendered images (defaults to 500)
//   HUBOT_GRAFANA_DEFAULT_TIME_ZONE - Optional; Default time zone (default to "")
//   HUBOT_GRAFANA_S3_BUCKET - Optional; Name of the S3 bucket to copy the graph into
//   HUBOT_GRAFANA_S3_PREFIX - Optional; Bucket prefix (useful for shared buckets)
//   HUBOT_GRAFANA_S3_REGION - Optional; Bucket region (defaults to us-standard)
//   HUBOT_GRAFANA_USE_THREADS - Optional; When set to any value, graphs are sent in thread instead of as new message.
//   HUBOT_SLACK_TOKEN - Optional; Token to connect to Slack (already configured with the adapter)
//   ROCKETCHAT_URL - Optional; URL to your Rocket.Chat instance (already configured with the adapter)
//   ROCKETCHAT_USER - Optional; Bot username (already configured with the adapter)
//   ROCKETCHAT_PASSWORD - Optional; Bot password (already configured with the adapter)
//
// Notes:
//   If you want to use the Slack adapter's "attachment" formatting:
//     hubot: v2.7.2+
//     hubot-slack: 4.0+
//
// Commands:
//   hubot graf set `[host|api_key]` <value> - Setup Grafana host or API key
//   hubot graf db <dashboard uid>[:<panel id>][ <template variables>][ <from clause>][ <to clause>] - Show grafana dashboard graphs
//   hubot graf list <tag> - Lists all dashboards available (optional: <tag>)
//   hubot graf search <keyword> - Search available dashboards by <keyword>
//   hubot graf alerts[ <state>] - Show all alerts (optional: <state>)
//   hubot graf pause alert <id> - Pause the alert with specified <id>
//   hubot graf unpause alert <id> - Un-pause the alert with specified <id>
//   hubot graf pause all alerts - Pause all alerts (admin permissions required)
//   hubot graf unpause all alerts - Un-pause all alerts (admin permissions required)
//

const { GrafanaClient } = require('./grafana-client');
const { Adapter } = require('./adapters/Adapter');

/**
 * Adds the Grafana commands to Hubot.
 * @param {Hubot.Robot} robot
 */
module.exports = (robot) => {
  // Various configuration options stored in environment variables
  const grafana_host = process.env.HUBOT_GRAFANA_HOST;
  const grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY;
  const grafana_per_room = process.env.HUBOT_GRAFANA_PER_ROOM;
  const grafana_query_time_range = process.env.HUBOT_GRAFANA_QUERY_TIME_RANGE || '6h';
  const max_return_dashboards = process.env.HUBOT_GRAFANA_MAX_RETURNED_DASHBOARDS || 25;

  const adapter = new Adapter(robot);

  // Set Grafana host/api_key
  robot.respond(/(?:grafana|graph|graf) set (host|api_key) (.+)/i, (msg) => {
    if (grafana_per_room === '1') {
      const context = msg.message.user.room.split('@')[0];
      robot.brain.set(`grafana_${msg.match[1]}_${context}`, msg.match[2]);
      return msg.send(`Value set for ${msg.match[1]}`);
    }
    return sendError('Set HUBOT_GRAFANA_PER_ROOM=1 to use multiple configurations.', msg);
  });

  // Get a specific dashboard with options
  robot.respond(/(?:grafana|graph|graf) (?:dash|dashboard|db) ([A-Za-z0-9\-\:_]+)(.*)?/i, (msg) => {
    const grafana = createGrafanaClient(msg);
    if (!grafana) return;

    let uid = msg.match[1].trim();
    const remainder = msg.match[2];
    const timespan = {
      from: `now-${grafana_query_time_range}`,
      to: 'now',
    };
    let variables = '';
    const template_params = [];
    let visualPanelId = false;
    let apiPanelId = false;
    let pname = false;
    const query = {
      width: process.env.HUBOT_GRAFANA_DEFAULT_WIDTH || 1000,
      height: process.env.HUBOT_GRAFANA_DEFAULT_HEIGHT || 500,
      tz: process.env.HUBOT_GRAFANA_DEFAULT_TIME_ZONE || '',
      orgId: process.env.HUBOT_GRAFANA_ORG_ID || '',
      apiEndpoint: process.env.HUBOT_GRAFANA_API_ENDPOINT || 'd-solo',
    };

    // Parse out a specific panel
    if (/\:/.test(uid)) {
      let parts = uid.split(':');
      uid = parts[0];
      visualPanelId = parseInt(parts[1], 10);
      if (isNaN(visualPanelId)) {
        visualPanelId = false;
        pname = parts[1].toLowerCase();
      }
      if (/panel-[0-9]+/.test(pname)) {
        parts = pname.split('panel-');
        apiPanelId = parseInt(parts[1], 10);
        pname = false;
      }
    }

    // Check if we have any extra fields
    if (remainder && remainder.trim() !== '') {
      // The order we apply non-variables in
      const timeFields = ['from', 'to'];

      for (const part of Array.from(remainder.trim().split(' '))) {
        // Check if it's a variable or part of the timespan
        if (part.indexOf('=') >= 0) {
          // put query stuff into its own dict
          if (part.split('=')[0] in query) {
            query[part.split('=')[0]] = part.split('=')[1];
            continue;
          }

          variables = `${variables}&var-${part}`;
          template_params.push({
            name: part.split('=')[0],
            value: part.split('=')[1],
          });

          // Only add to the timespan if we haven't already filled out from and to
        } else if (timeFields.length > 0) {
          timespan[timeFields.shift()] = part.trim();
        }
      }
    }

    robot.logger.debug(msg.match);
    robot.logger.debug(uid);
    robot.logger.debug(timespan);
    robot.logger.debug(variables);
    robot.logger.debug(template_params);
    robot.logger.debug(visualPanelId);
    robot.logger.debug(apiPanelId);
    robot.logger.debug(pname);

    // Call the API to get information about this dashboard
    return grafana.get(`dashboards/uid/${uid}`).then((dashboard) => {
      robot.logger.debug(dashboard);

      // Check dashboard information
      if (!dashboard) {
        sendError('An error ocurred. Check your logs for more details.', msg);
        return;
      }

      if (dashboard.message) {
        // Search for URL slug to offer help
        if (dashboard.message == 'Dashboard not found') {
          grafana.get('search?type=dash-db').then((results) => {
            for (const item of Array.from(results)) {
              if (item.url.match(new RegExp(`\/d\/[a-z0-9\-]+\/${uid}$`, 'i'))) {
                sendError(`Try your query again with \`${item.uid}\` instead of \`${uid}\``, msg);
                return;
              }
            }
            return sendError(dashboard.message, msg);
          });
        } else {
          sendError(dashboard.message, msg);
        }
        return;
      }

      // Defaults
      const data = dashboard.dashboard;

      // Handle refactor done for version 5.0.0+
      if (dashboard.dashboard.panels) {
        // Concept of "rows" was replaced by coordinate system
        data.rows = [dashboard.dashboard];
      }

      // Handle empty dashboard
      if (data.rows == null) {
        return sendError('Dashboard empty.', msg);
      }

      // Support for templated dashboards
      let template_map;
      robot.logger.debug(data.templating.list);
      if (data.templating.list) {
        template_map = [];
        for (const template of Array.from(data.templating.list)) {
          robot.logger.debug(template);
          if (!template.current) {
            continue;
          }
          for (const _param of Array.from(template_params)) {
            if (template.name === _param.name) {
              template_map[`$${template.name}`] = _param.value;
            } else {
              template_map[`$${template.name}`] = template.current.text;
            }
          }
        }
      }

      // Return dashboard rows
      let panelNumber = 0;
      let returnedCount = 0;
      for (const row of Array.from(data.rows)) {
        for (const panel of Array.from(row.panels)) {
          robot.logger.debug(panel);

          panelNumber += 1;
          // Skip if visual panel ID was specified and didn't match
          if (visualPanelId && visualPanelId !== panelNumber) {
            continue;
          }

          // Skip if API panel ID was specified and didn't match
          if (apiPanelId && apiPanelId !== panel.id) {
            continue;
          }

          // Skip if panel name was specified any didn't match
          if (pname && panel.title.toLowerCase().indexOf(pname) === -1) {
            continue;
          }

          // Skip if we have already returned max count of dashboards
          if (returnedCount > max_return_dashboards) {
            continue;
          }

          // Build links for message sending
          const title = formatTitleWithTemplate(panel.title, template_map);
          ({ uid } = dashboard.dashboard);
          let imageUrl = `${grafana.grafana_host}/render/${query.apiEndpoint}/${uid}/?panelId=${panel.id}&width=${query.width}&height=${query.height}&from=${timespan.from}&to=${timespan.to}${variables}`;
          if (query.tz) {
            imageUrl += `&tz=${encodeURIComponent(query.tz)}`;
          }
          if (query.orgId) {
            imageUrl += `&orgId=${encodeURIComponent(query.orgId)}`;
          }
          const link = `${grafana.grafana_host}/d/${uid}/?panelId=${panel.id}&fullscreen&from=${timespan.from}&to=${timespan.to}${variables}`;

          sendDashboardChart(msg, title, imageUrl, link);
          returnedCount += 1;
        }
      }

      if (returnedCount === 0) {
        return sendError('Could not locate desired panel.', msg);
      }
    });
  });

  // Process the bot response
  const sendDashboardChart = (msg, title, imageUrl, link) => {
    if (adapter.isUploadSupported()) {
      uploadChart(msg, title, imageUrl, link);
    }
    else {
      adapter.responder.send(msg, title, imageUrl, link);
    }
  };

  // Get a list of available dashboards
  robot.respond(/(?:grafana|graph|graf) list\s?(.+)?/i, (msg) => {
    const grafana = createGrafanaClient(msg);
    if (!grafana) return;

    let url = 'search?type=dash-db';
    let title = 'Available dashboards:\n';
    if (msg.match[1]) {
      const tag = msg.match[1].trim();
      url += `&tag=${tag}`;
      title = `Dashboards tagged \`${tag}\`:\n`;
    }

    return grafana
      .get(url)
      .then((dashboards) => {
        robot.logger.debug(dashboards);
        return sendDashboardList(dashboards, title, msg);
      })
      .catch((err) => {
        robot.logger.error(err, 'Error while listing dashboards, url: ' + url);
      });
  });

  /**
   * Creates a Grafana client based on the context. If it can't create one
   * it will echo an error to the user.
   * @param {Hubot.Response} res the context.
   * @returns {GrafanaClient | null}
   */
  function createGrafanaClient(res) {
    let api_key = grafana_api_key;
    let host = grafana_host;

    if (grafana_per_room === '1') {
      const room = get_room(res);
      host = robot.brain.get(`grafana_host_${room}`);
      api_key = robot.brain.get(`grafana_api_key_${room}`);
    }

    if (host == null) {
      sendError('No Grafana endpoint configured.', res);
      return null;
    }

    let grafana = new GrafanaClient(robot.http, robot.logger, host, api_key);

    return grafana;
  }

  // Search dashboards
  robot.respond(/(?:grafana|graph|graf) search (.+)/i, (msg) => {
    const grafana = createGrafanaClient(msg);
    if (!grafana) return;

    const query = msg.match[1].trim();
    robot.logger.debug(query);

    return grafana
      .get(`search?type=dash-db&query=${query}`)
      .then((dashboards) => {
        const title = `Dashboards matching \`${query}\`:\n`;
        sendDashboardList(dashboards, title, msg);
      })
      .catch((err) => this.robot.logger.error(err, 'Error searching for dashboard.'));
  });

  // Show alerts
  robot.respond(/(?:grafana|graph|graf) alerts\s?(.+)?/i, async (msg) => {
    const grafana = createGrafanaClient(msg);
    if (!grafana) return;

    let url = 'alerts';
    let title = 'All alerts:\n';

    // all alerts of a specific type
    if (msg.match[1]) {
      const state = msg.match[1].trim();
      url = `alerts?state=${state}`;
      title = `Alerts with state '${state}':\n`;
    }

    robot.logger.debug(title.trim());

    await grafana
      .get(url)
      .then((alerts) => {
        robot.logger.debug(alerts);
        sendAlerts(alerts, title, msg);
      })
      .catch((err) => {
        robot.logger.error(err, 'Error while getting alerts on URL: ' + url);
      });
  });

  // Pause/unpause an alert
  robot.respond(/(?:grafana|graph|graf) (unpause|pause)\salert\s(\d+)/i, (msg) => {
    const grafana = createGrafanaClient(msg);
    if (!grafana) return;

    const paused = msg.match[1] === 'pause';
    const alertId = msg.match[2];
    const url = `alerts/${alertId}/pause`;

    return grafana
      .post(url, { paused })
      .then((result) => {
        robot.logger.debug(result);
        if (result.message) {
          msg.send(result.message);
        }
      })
      .catch((err) => {
        robot.logger.error(err, 'Error for URL: ' + url);
      });
  });

  // Pause/unpause all alerts
  // requires an API token with admin permissions
  robot.respond(/(?:grafana|graph|graf) (unpause|pause) all(?:\s+alerts)?/i, async (msg) => {
    const grafana = createGrafanaClient(msg);
    if (!grafana) return;

    const paused = msg.match[1] === 'pause';

    const alerts = await grafana.get('alerts');
    if (alerts == null || alerts.length == 0) {
      return;
    }

    let errored = 0;
    for (const alert of Array.from(alerts)) {
      const url = `alerts/${alert.id}/pause`;
      try {
        await grafana.post(url, { paused });
      } catch (err) {
        robot.logger.error(err, 'Error for URL: ' + url);
        errored++;
      }
    }

    msg.send(`Successfully tried to ${msg.match[1]} *${alerts.length}* alerts.\n*Success: ${alerts.length - errored}*\n*Errored: ${errored}*`);
  });

  // Send a list of alerts

  /**
   *
   * @param {any[]} alerts list of alerts
   * @param {string} title the title
   * @param {Hubot.Response} res the context
   * @returns
   */
  const sendAlerts = (alerts, title, res) => {
    if (!(alerts.length > 0)) {
      return;
    }
    for (const alert of Array.from(alerts)) {
      let line = `- *${alert.name}* (${alert.id}): \`${alert.state}\``;
      if (alert.newStateDate) {
        line += `\n  last state change: ${alert.newStateDate}`;
      }
      if (alert.executionError) {
        line += `\n  execution error: ${alert.executionError}`;
      }
      title = `${title + line}\n`;
    }
    res.send(title.trim());
  };

  /**
   * Sends the list of dashboards.
   * @param {any} dashboards the list of dashboards
   * @param {string} title the title that is printed before the result
   * @param {Hubot.Response} res the context.
   * @returns
   */
  const sendDashboardList = (dashboards, title, res) => {
    let remaining;
    robot.logger.debug(dashboards);
    if (!(dashboards.length > 0)) {
      return;
    }

    remaining = 0;
    if (dashboards.length > max_return_dashboards) {
      remaining = dashboards.length - max_return_dashboards;
      dashboards = dashboards.slice(0, max_return_dashboards - 1);
    }

    const list = [];
    for (const dashboard of Array.from(dashboards)) {
      list.push(`- ${dashboard.uid}: ${dashboard.title}`);
    }

    if (remaining) {
      list.push(` (and ${remaining} more)`);
    }

    return res.send(title + list.join('\n'));
  };

  // Handle generic errors

  /**
   * *Sends an error message.
   * @param {string} message the error message.
   * @param {Hubot.Response} res the resonse context.
   */
  const sendError = (message, res) => {
    robot.logger.error(message);
    res.send(message);
  };

  // Format the title with template vars
  const formatTitleWithTemplate = (title, template_map) => {
    if (!title) {
      title = '';
    }
    return title.replace(/\$\w+/g, (match) => {
      if (template_map[match]) {
        return template_map[match];
      }
      return match;
    });
  };

  // Fetch an image from provided URL, upload it to S3, returning the resulting URL
  const uploadChart = (msg, title, url, link) => {
    const grafana = createGrafanaClient(msg);
    if (!grafana) return;

    /**
     * Pass this function along to the "registered" services that uploads the image.
     * The function will download the .png image(s) dashboard. You must pass this
     * function and use it inside your service upload implementation.
     * @param {({ body: Buffer, contentType: string})=>void} callback
     */
    const grafanaDashboardRequest = (callback) => {
      grafana
        .download(url)
        .then((r) => {
          if (callback) {
            callback(r);
          }
        })
        .catch((err) => {
          sendError(err, msg);
        });
    };

    // Default title if none provided
    if (!title) {
      title = 'Image';
    }

    adapter.uploader.upload(msg, title, grafanaDashboardRequest, link);
  };
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

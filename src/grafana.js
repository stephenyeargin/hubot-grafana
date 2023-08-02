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

const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const request = require('request');

module.exports = (robot) => {
  // Various configuration options stored in environment variables
  let grafana_host = process.env.HUBOT_GRAFANA_HOST;
  let grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY;
  const grafana_per_room = process.env.HUBOT_GRAFANA_PER_ROOM;
  const grafana_query_time_range = process.env.HUBOT_GRAFANA_QUERY_TIME_RANGE || '6h';
  const s3_bucket = process.env.HUBOT_GRAFANA_S3_BUCKET;
  const s3_prefix = process.env.HUBOT_GRAFANA_S3_PREFIX;
  const s3_region = process.env.HUBOT_GRAFANA_S3_REGION || process.env.AWS_REGION || 'us-standard';
  const slack_token = process.env.HUBOT_SLACK_TOKEN;
  let rocketchat_url = process.env.ROCKETCHAT_URL;
  const rocketchat_user = process.env.ROCKETCHAT_USER;
  const rocketchat_password = process.env.ROCKETCHAT_PASSWORD;
  const max_return_dashboards = process.env.HUBOT_GRAFANA_MAX_RETURNED_DASHBOARDS || 25;
  const use_threads = process.env.HUBOT_GRAFANA_USE_THREADS || false;

  if (rocketchat_url && !rocketchat_url.startsWith('http')) {
    rocketchat_url = `http://${rocketchat_url}`;
  }

  const site = () => {
    // prioritize S3 if configured
    if (s3_bucket) {
      return 's3';
    } if (/slack/i.test(robot.adapterName)) {
      return 'slack';
    } if (/rocketchat/i.test(robot.adapterName)) {
      return 'rocketchat';
    } if (/telegram/i.test(robot.adapterName)) {
      return 'telegram';
    }
    return '';
  };
  const isUploadSupported = site() !== '';

  const get_room = (msg) => // placeholder for further adapter support (i.e. MS Teams) as then room also
    // contains thread conversation id
    msg.envelope.room;

  const get_grafana_endpoint = (msg) => {
    if (grafana_per_room === '1') {
      const room = get_room(msg);
      grafana_host = robot.brain.get(`grafana_host_${room}`);
      grafana_api_key = robot.brain.get(`grafana_api_key_${room}`);
      if (!grafana_host) {
        return;
      }
    }
    return { host: grafana_host, api_key: grafana_api_key };
  };

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
    const endpoint = get_grafana_endpoint(msg);
    if (!endpoint) {
      sendError('No Grafana endpoint configured.', msg);
      return;
    }
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
    if (remainder && (remainder.trim() !== '')) {
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
          template_params.push({ name: part.split('=')[0], value: part.split('=')[1] });

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
    return callGrafana(endpoint, `dashboards/uid/${uid}`, (dashboard) => {
      let template_map;
      robot.logger.debug(dashboard);
      // Check dashboard information
      if (!dashboard) {
        return sendError('An error ocurred. Check your logs for more details.', msg);
      }
      if (dashboard.message) {
        // Search for URL slug to offer help
        if ((dashboard.message = 'Dashboard not found')) {
          callGrafana(endpoint, 'search?type=dash-db', (results) => {
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
      if ((data.rows == null)) {
        return sendError('Dashboard empty.', msg);
      }

      // Support for templated dashboards
      robot.logger.debug(data.templating.list);
      if (data.templating.list) {
        template_map = [];
        for (const template of Array.from(data.templating.list)) {
          robot.logger.debug(template);
          if (!template.current) { continue; }
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
          if (visualPanelId && (visualPanelId !== panelNumber)) {
            continue;
          }

          // Skip if API panel ID was specified and didn't match
          if (apiPanelId && (apiPanelId !== panel.id)) {
            continue;
          }

          // Skip if panel name was specified any didn't match
          if (pname && (panel.title.toLowerCase().indexOf(pname) === -1)) {
            continue;
          }

          // Skip if we have already returned max count of dashboards
          if (returnedCount > max_return_dashboards) {
            continue;
          }

          // Build links for message sending
          const title = formatTitleWithTemplate(panel.title, template_map);
          ({
            uid,
          } = dashboard.dashboard);
          let imageUrl = `${endpoint.host}/render/${query.apiEndpoint}/${uid}/?panelId=${panel.id}&width=${query.width}&height=${query.height}&from=${timespan.from}&to=${timespan.to}${variables}`;
          if (query.tz) {
            imageUrl += `&tz=${encodeURIComponent(query.tz)}`;
          }
          if (query.orgId) {
            imageUrl += `&orgId=${encodeURIComponent(query.orgId)}`;
          }
          const link = `${endpoint.host}/d/${uid}/?panelId=${panel.id}&fullscreen&from=${timespan.from}&to=${timespan.to}${variables}`;

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
    if (isUploadSupported) {
      return uploadChart(msg, title, imageUrl, link, site);
    }
    return sendRobotResponse(msg, title, imageUrl, link);
  };

  // Get a list of available dashboards
  robot.respond(/(?:grafana|graph|graf) list\s?(.+)?/i, (msg) => {
    const endpoint = get_grafana_endpoint(msg);
    if (!endpoint) {
      return sendError('No Grafana endpoint configured.', msg);
    } if (msg.match[1]) {
      const tag = msg.match[1].trim();
      return callGrafana(endpoint, `search?type=dash-db&tag=${tag}`, (dashboards) => {
        robot.logger.debug(dashboards);
        const response = `Dashboards tagged \`${tag}\`:\n`;
        return sendDashboardList(dashboards, response, msg);
      });
    }
    return callGrafana(endpoint, 'search?type=dash-db', (dashboards) => {
      robot.logger.debug(dashboards);
      const response = 'Available dashboards:\n';
      return sendDashboardList(dashboards, response, msg);
    });
  });

  // Search dashboards
  robot.respond(/(?:grafana|graph|graf) search (.+)/i, (msg) => {
    const query = msg.match[1].trim();
    const endpoint = get_grafana_endpoint(msg);
    robot.logger.debug(query);
    if (!endpoint) {
      sendError('No Grafana endpoint configured.', msg);
      return;
    }
    return callGrafana(endpoint, `search?type=dash-db&query=${query}`, (dashboards) => {
      robot.logger.debug(dashboards);
      const response = `Dashboards matching \`${query}\`:\n`;
      return sendDashboardList(dashboards, response, msg);
    });
  });

  // Show alerts
  robot.respond(/(?:grafana|graph|graf) alerts\s?(.+)?/i, (msg) => {
    const endpoint = get_grafana_endpoint(msg);
    if (!endpoint) {
      sendError('No Grafana endpoint configured.', msg);
      return;
    }
    // all alerts of a specific type
    if (msg.match[1]) {
      const state = msg.match[1].trim();
      return callGrafana(endpoint, `alerts?state=${state}`, (alerts) => {
        robot.logger.debug(alerts);
        return sendAlerts(alerts, `Alerts with state '${state}':\n`, msg);
      });
      // *all* alerts
    }
    robot.logger.debug('Show all alerts');
    return callGrafana(endpoint, 'alerts', (alerts) => {
      robot.logger.debug(alerts);
      return sendAlerts(alerts, 'All alerts:\n', msg);
    });
  });

  // Pause/unpause an alert
  robot.respond(/(?:grafana|graph|graf) (unpause|pause)\salert\s(\d+)/i, (msg) => {
    const paused = msg.match[1] === 'pause';
    const alertId = msg.match[2];
    const endpoint = get_grafana_endpoint(msg);
    if (!endpoint) {
      sendError('No Grafana endpoint configured.', msg);
      return;
    }
    return postGrafana(endpoint, `alerts/${alertId}/pause`, { paused }, (result) => {
      robot.logger.debug(result);
      if (result.message) {
        return msg.send(result.message);
      }
    });
  });

  // Pause/unpause all alerts
  // requires an API token with admin permissions
  robot.respond(/(?:grafana|graph|graf) (unpause|pause) all(?:\s+alerts)?/i, (msg) => {
    const paused = msg.match[1] === 'pause';
    const endpoint = get_grafana_endpoint(msg);
    if (!endpoint) {
      sendError('No Grafana endpoint configured.', msg);
      return;
    }
    return callGrafana(endpoint, 'alerts', (alerts) => {
      robot.logger.debug(alerts);
      let errored = 0;
      if (!(alerts.length > 0)) {
        return;
      }
      for (const alert of Array.from(alerts)) {
        postGrafana(endpoint, `alerts/${alert.id}/pause`, { paused }, (result) => {
          robot.logger.debug(result);
          if (result === false) {
            return errored += 1;
          }
        });
      }
      return msg.send(`Successfully tried to ${msg.match[1]} *${alerts.length}* alerts.\n*Success: ${alerts.length - errored}*\n*Errored: ${errored}*`);
    });
  });

  // Send a list of alerts
  const sendAlerts = (alerts, response, msg) => {
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
      response = `${response + line}\n`;
    }
    return msg.send(response.trim());
  };

  // Send Dashboard list
  const sendDashboardList = (dashboards, response, msg) => {
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

    return msg.send(response + list.join('\n'));
  };

  // Handle generic errors
  const sendError = (message, msg) => {
    robot.logger.error(message);
    return msg.send(message);
  };

  // Format the title with template vars
  const formatTitleWithTemplate = (title, template_map) => {
    if (!title) { title = ''; }
    return title.replace(/\$\w+/g, (match) => {
      if (template_map[match]) {
        return template_map[match];
      }
      return match;
    });
  };

  // Send robot response
  const sendRobotResponse = (msg, title, image, link) => {
    switch (robot.adapterName) {
      // Slack
      case 'slack':
      case 'hubot-slack':
      case '@hubot-friends/hubot-slack':
        if (use_threads) { msg.message.thread_ts = msg.message.rawMessage.ts; }
        return msg.send({
          attachments: [
            {
              fallback: `${title}: ${image} - ${link}`,
              title,
              title_link: link,
              image_url: image,
            },
          ],
          unfurl_links: false,
        });
      // Hipchat
      case 'hipchat':
      case 'hubot-hipchat':
        return msg.send(`${title}: ${link} - ${image}`);
      // BearyChat
      case 'hubot-bearychat':
      case 'bearychat':
        return robot.emit('bearychat.attachment', {
          message: {
            room: msg.envelope.room,
          },
          text: `[${title}](${link})`,
          attachments: [
            {
              fallback: `${title}: ${image} - ${link}`,
              images: [
                { url: image },
              ],
            },
          ],
        });
      // Everything else
      default:
        return msg.send(`${title}: ${image} - ${link}`);
    }
  };

  // Call off to Grafana
  const callGrafana = (endpoint, url, callback) => robot.http(`${endpoint.host}/api/${url}`).headers(grafanaHeaders(endpoint)).get()((err, res, body) => {
    if (err) {
      robot.logger.error(err);
      return callback(false);
    }
    const data = JSON.parse(body);
    return callback(data);
  });

  // Post to Grafana
  const postGrafana = (endpoint, url, data, callback) => {
    const jsonPayload = JSON.stringify(data);
    return robot.http(`${endpoint.host}/api/${url}`).headers(grafanaHeaders(endpoint, true)).post(jsonPayload)((err, res, body) => {
      if (err) {
        robot.logger.error(err);
        return callback(false);
      }
      data = JSON.parse(body);
      return callback(data);
    });
  };

  const grafanaHeaders = (endpoint, post) => {
    if (post == null) { post = false; }
    const headers = { Accept: 'application/json' };
    if (endpoint.api_key) {
      headers.Authorization = `Bearer ${endpoint.api_key}`;
    }
    if (post) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // Pick a random filename
  const uploadPath = () => {
    const prefix = s3_prefix || 'grafana';
    return `${prefix}/${crypto.randomBytes(20).toString('hex')}.png`;
  };

  const uploadTo = {
    s3(msg, title, grafanaDashboardRequest, link) {
      return grafanaDashboardRequest(async (err, res, body) => {
        const s3 = new S3Client({
          apiVersion: '2006-03-01',
          region: s3_region,
        });

        const params = {
          Bucket: s3_bucket,
          Key: uploadPath(),
          Body: body,
          ACL: 'public-read',
          ContentLength: body.length,
          ContentType: res.headers['content-type'],
        };
        const command = new PutObjectCommand(params);

        s3.send(command)
          .then(() => {
            return sendRobotResponse(msg, title, `https://${s3_bucket}.s3.${s3_region}.amazonaws.com/${params.Key}`, link);
          })
          .catch((s3Err) => {
            robot.logger.error(`Upload Error Code: ${s3Err}`);
            return msg.send(`${title} - [Upload Error] - ${link}`);
          });
      });
    },

    slack(msg, title, grafanaDashboardRequest, link) {
      const testAuthData = {
        url: 'https://slack.com/api/auth.test',
        formData: {
          token: slack_token,
        },
      };

      // We test auth against slack to obtain the team URL
      return request.post(testAuthData, (err, httpResponse, slackResBody) => {
        if (err) {
          robot.logger.error(err);
          return msg.send(`${title} - [Slack auth.test Error - invalid token/can't fetch team url] - ${link}`);
        }
        const slack_url = JSON.parse(slackResBody).url;

        // fill in the POST request. This must be www-form/multipart
        const uploadData = {
          url: `${slack_url.replace(/\/$/, '')}/api/files.upload`,
          formData: {
            title: `${title}`,
            channels: msg.envelope.room,
            token: slack_token,
            // grafanaDashboardRequest() is the method that downloads the .png
            file: grafanaDashboardRequest(),
            filetype: 'png',
          },
        };

        // Post images in thread if configured
        if (use_threads) { uploadData.formData.thread_ts = msg.message.rawMessage.ts; }

        // Try to upload the image to slack else pass the link over
        return request.post(uploadData, (err, httpResponse, body) => {
          const res = JSON.parse(body);

          // Error logging, we must also check the body response.
          // It will be something like: { "ok": <boolean>, "error": <error message> }
          if (err) {
            robot.logger.error(err);
            return msg.send(`${title} - [Upload Error] - ${link}`);
          } if (!res.ok) {
            robot.logger.error(`Slack service error while posting data:${res.error}`);
            return msg.send(`${title} - [Form Error: can't upload file] - ${link}`);
          }
        });
      });
    },

    rocketchat(msg, title, grafanaDashboardRequest, link) {
      const authData = {
        url: `${rocketchat_url}/api/v1/login`,
        form: {
          username: rocketchat_user,
          password: rocketchat_password,
        },
      };

      // We auth against rocketchat to obtain the auth token
      return request.post(authData, (err, httpResponse, rocketchatResBody) => {
        if (err) {
          robot.logger.error(err);
          return msg.send(`${title} - [Rocketchat auth Error - invalid url, user or password/can't access rocketchat api] - ${link}`);
        }
        let errMsg;
        const { status } = JSON.parse(rocketchatResBody);
        if (status !== 'success') {
          errMsg = JSON.parse(rocketchatResBody).message;
          robot.logger.error(errMsg);
          msg.send(`${title} - [Rocketchat auth Error - ${errMsg}] - ${link}`);
        }

        const auth = JSON.parse(rocketchatResBody).data;

        // fill in the POST request. This must be www-form/multipart
        const uploadData = {
          url: `${rocketchat_url}/api/v1/rooms.upload/${msg.envelope.user.roomID}`,
          headers: {
            'X-Auth-Token': auth.authToken,
            'X-User-Id': auth.userId,
          },
          formData: {
            msg: `${title}: ${link}`,
            // grafanaDashboardRequest() is the method that downloads the .png
            file: {
              value: grafanaDashboardRequest(),
              options: {
                filename: `${title} ${Date()}.png`,
                contentType: 'image/png',
              },
            },
          },
        };

        // Try to upload the image to rocketchat else pass the link over
        return request.post(uploadData, (err, httpResponse, body) => {
          const res = JSON.parse(body);

          // Error logging, we must also check the body response.
          // It will be something like: { "success": <boolean>, "error": <error message> }
          if (err) {
            robot.logger.error(err);
            return msg.send(`${title} - [Upload Error] - ${link}`);
          } if (!res.success) {
            errMsg = res.error;
            robot.logger.error(`rocketchat service error while posting data:${errMsg}`);
            return msg.send(`${title} - [Form Error: can't upload file : ${errMsg}] - ${link}`);
          }
        });
      });
    },
    telegram(msg, title, grafanaDashboardRequest, link) {
      const caption = `${title}: ${link}`;
      return msg.sendPhoto(msg.envelope.room, grafanaDashboardRequest(), { caption });
    },
  };

  // Fetch an image from provided URL, upload it to S3, returning the resulting URL
  const uploadChart = (msg, title, url, link, site) => {
    let requestHeaders;
    if (grafana_api_key) {
      requestHeaders = {
        encoding: null,
        auth: {
          bearer: grafana_api_key,
        },
      };
    } else {
      requestHeaders = { encoding: null };
    }

    // Default title if none provided
    if (!title) {
      title = 'Image';
    }

    // Pass this function along to the "registered" services that uploads the image.
    // The function will download the .png image(s) dashboard. You must pass this
    // function and use it inside your service upload implementation.
    const grafanaDashboardRequest = (callback) => request(url, requestHeaders, (err, res, body) => {
      if (err) {
        return sendError(err, msg);
      }
      robot.logger.debug(`Uploading file: ${body.length} bytes, content-type[${res.headers['content-type']}]`);
      if (callback) {
        return callback(err, res, body);
      }
      return null;
    });

    return uploadTo[site()](msg, title, grafanaDashboardRequest, link);
  };
};

"strict"

class GrafanaClient {
  constructor(robot) {
    this.robot = robot;

    // Various configuration options stored in environment variables
    this.grafana_host = process.env.HUBOT_GRAFANA_HOST;
    this.grafana_api_key = process.env.HUBOT_GRAFANA_API_KEY;
    this.grafana_per_room = process.env.HUBOT_GRAFANA_PER_ROOM;
  }

  call(msg, url, callback) {
    const endpoint = this.get_grafana_endpoint(msg);
    if (!endpoint) {
      this.sendError('No Grafana endpoint configured.', msg);
      return;
    }

    this.robot
      .http(`${endpoint.host}/api/${url}`) // TODO: should we use robot.http or just fetch
      .headers(grafanaHeaders(endpoint))
      .get()((err, res, body) => {
      if (err) {
        this.robot.logger.error(err);
        return callback(false);
      }
      const data = JSON.parse(body);
      return callback(data);
    });
  }

  // Post to Grafana
  post(msg, url, data, callback) {
    const endpoint = this.get_grafana_endpoint(msg);
    if (!endpoint) {
      this.sendError('No Grafana endpoint configured.', msg);
      return;
    }

    const jsonPayload = JSON.stringify(data);
    return this.robot
      .http(`${endpoint.host}/api/${url}`) // TODO: should we use robot.http or just fetch
      .headers(grafanaHeaders(endpoint, true))
      .post(jsonPayload)((err, res, body) => {
      if (err) {
        this.robot.logger.error(err);
        return callback(false);
      }
      data = JSON.parse(body);
      return callback(data);
    });
  }

  get_room(msg) {
    // placeholder for further adapter support (i.e. MS Teams) as then room also
    // contains thread conversation id
    return msg.envelope.room;
  }

  get_grafana_endpoint(msg) {
    let grafana_api_key = this.grafana_api_key;
    let grafana_host = this.grafana_host;

    if (this.grafana_per_room === "1") {
      const room = this.get_room(msg);
      grafana_host = this.robot.brain.get(`grafana_host_${room}`);
      grafana_api_key = this.robot.brain.get(`grafana_api_key_${room}`);
      if (!grafana_host) {
        return null;
      }
    }
    return { host: grafana_host, api_key: grafana_api_key };
  }

  has_end_point(msg) {
    return this.get_grafana_endpoint(msg) !== null;
  }

  // Handle generic errors
  //TODO: not sure if error handling should be here
  sendError(message, msg) {
    this.robot.logger.error(message);
    return msg.send(message);
  }
}

const grafanaHeaders = (endpoint, post) => {
  if (post == null) {
    post = false;
  }
  const headers = { Accept: "application/json" };
  if (endpoint.api_key) {
    headers.Authorization = `Bearer ${endpoint.api_key}`;
  }
  if (post) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

module.exports = {
  GrafanaClient,
};

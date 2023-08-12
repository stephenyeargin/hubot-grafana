// Call off to Grafana

class GrafanaClient {
  constructor(robot) {
    this.robot = robot;
  }

  call(endpoint, url, callback) {
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
  post(endpoint, url, data, callback) {

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
  GrafanaClient
};

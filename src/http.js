/**
 *
 * @param {Hubot.Robot} robot the robot, which will provide an HTTP
 * @param {{url: string, formData: Record<string, any>}} uploadData
 * @param {(err: Error | null, data: any)=>void} callback
 */
function post(robot, uploadData, callback) {
  robot.http(uploadData.url).post(new FormData(uploadData.formData))((err, res, body) => {
    if (err) {
      callback(err, null);
      return;
    }

    data = JSON.parse(body);
    callback(null, data);
  });
}

module.exports = {
  post,
};

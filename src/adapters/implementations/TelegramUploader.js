'strict';
const { Uploader } = require('../Uploader');

class TelegramUploader extends Uploader {

  upload(msg, title, grafanaDashboardRequest, link) {
    const caption = `${title}: ${link}`;
    return msg.sendPhoto(msg.envelope.room, grafanaDashboardRequest(), {
      caption,
    });
  }
}
exports.TelegramUploader = TelegramUploader;

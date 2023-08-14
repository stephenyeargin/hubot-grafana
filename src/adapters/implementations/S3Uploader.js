'strict';

const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Uploader } = require('../Uploader');

class S3Uploader extends Uploader {
  /**
   *
   * @param {Responder} responder the responder, called when the upload completes
   * @param {Hubot.Log} logger the logger
   */
  constructor(responder, logger) {
    super();

    /** @type {Responder} */
    this.responder = responder;

    /** @type {Hubot.Log} */
    this.logger = logger;

    /** @type {string} */
    this.s3_bucket = process.env.HUBOT_GRAFANA_S3_BUCKET;

    /** @type {string} */
    this.s3_prefix = process.env.HUBOT_GRAFANA_S3_PREFIX;

    /** @type {string} */
    this.s3_region = process.env.HUBOT_GRAFANA_S3_REGION || process.env.AWS_REGION || 'us-standard';
  }

  upload(msg, title, grafanaDashboardRequest, link) {
    return grafanaDashboardRequest(async (download) => {
      // Pick a random filename
      const prefix = this.s3_prefix || 'grafana';
      const uploadPath = `${prefix}/${crypto.randomBytes(20).toString('hex')}.png`;

      const s3 = new S3Client({
        apiVersion: '2006-03-01',
        region: this.s3_region,
      });

      const params = {
        Bucket: this.s3_bucket,
        Key: uploadPath,
        Body: download.body,
        ACL: 'public-read',
        ContentLength: download.body.length,
        ContentType: download.contentType,
      };
      const command = new PutObjectCommand(params);

      s3.send(command)
        .then(() => {
          this.responder.send(msg, title, `https://${this.s3_bucket}.s3.${this.s3_region}.amazonaws.com/${params.Key}`, link);
        })
        .catch((s3Err) => {
          this.logger.error(`Upload Error Code: ${s3Err}`);
          return msg.send(`${title} - [Upload Error] - ${link}`);
        });
    });
  }
}
exports.S3Uploader = S3Uploader;

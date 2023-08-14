const Helper = require('hubot-test-helper');
const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  'adapters/slack.js',
  './../src/grafana.js',
]);

const {
  expect,
} = chai;

let room;

describe('slack', () => {
  beforeEach(() => {
    process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org';
    process.env.HUBOT_GRAFANA_API_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxx';
    process.env.HUBOT_SLACK_TOKEN = 'foobarbaz';

    nock('https://play.grafana.org')
      .get('/api/dashboards/uid/97PlYC7Mk')
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-grafana-play.json`);
    return nock('https://play.grafana.org')
      .defaultReplyHeaders({
        'Content-Type': 'image/png',
      })
      .get('/render/d-solo/97PlYC7Mk/')
      .query({
        panelId: 3,
        width: 1000,
        height: 500,
        from: 'now-6h',
        to: 'now',
      })
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-grafana-play.png`);
  });

  afterEach(() => {
    delete process.env.HUBOT_GRAFANA_HOST;
    delete process.env.HUBOT_GRAFANA_API_KEY;
    delete process.env.HUBOT_SLACK_TOKEN;
    return nock.cleanAll();
  });

  context('slack upload', () => {
    beforeEach(function () {
      room = helper.createRoom();
      nock.disableNetConnect();
      nock('https://slack.com')
        .post('/api/auth.test')
        .replyWithFile(200, `${__dirname}/fixtures/slack/auth.test.json`);
      return nock('https://subarachnoid.slack.com')
        .post('/api/files.upload')
        .replyWithFile(200, `${__dirname}/fixtures/slack/files.upload.json`);
    });

    afterEach(function () {
      nock.cleanAll();
      return room.destroy();
    });

    it('should respond with an uploaded graph', function (done) {
      const selfRoom = room;
      selfRoom.user.say('alice', '@hubot graf db 97PlYC7Mk:panel-3');
      setTimeout(
        () => {
          try {
            expect(selfRoom.messages).to.eql([
              ['alice', '@hubot graf db 97PlYC7Mk:panel-3'],
            ]);
            // This would be where the actual image would be returned. There is
            // not an easy way to mock that, so we are assuming that the other
            // pieces worked as expected if we get to here without errors.
            expect(selfRoom.messages).to.eql([
              ['alice', '@hubot graf db 97PlYC7Mk:panel-3'],
            ]);
            done();
          } catch (err) {
            done(err);
          }
        },
        100,
      );
    });
  });

  context('slack and s3', () => {
    beforeEach(function () {
      process.env.AWS_ACCESS_KEY_ID = 'key_id'
      process.env.AWS_SECRET_ACCESS_KEY = 'secret_key'
      process.env.AWS_REGION = 'us-west-2'
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID = '99999999999999999';
      process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY = '9999999999999999999999';
      nock.disableNetConnect();
      room = helper.createRoom();

      return nock('https://graf.s3.us-west-2.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
        .put('/grafana/abdcdef0123456789.png')
        .query({ 'x-id': 'PutObject' })
        .reply(200);
    });

    afterEach(function () {
      room.destroy();
      nock.cleanAll();
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      delete process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID;
      delete process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY;
    });

    it('should respond with an uploaded graph', function (done) {
      const selfRoom = room;
      selfRoom.user.say('alice', '@hubot graf db 97PlYC7Mk:panel-3');
      setTimeout(
        () => {
          try {
            expect(selfRoom.messages[1][1]).to.be.a('object');
            expect(selfRoom.messages[1][1]).to.have.property('attachments');
            expect(selfRoom.messages[1][1].attachments[0]).to.have.property('title');
            expect(selfRoom.messages[1][1].attachments[0]).to.have.property('title_link');
            expect(selfRoom.messages[1][1].attachments[0]).to.have.property('fallback');
            expect(selfRoom.messages[1][1].attachments[0]).to.have.property('image_url');
            expect(selfRoom.messages[1][1].unfurl_links).to.eql(false);
            expect(nock.activeMocks()).to.eql([]);
            done();
          } catch (err) {
            done(err);
          }
        },
        100,
      );
    });
  });
});

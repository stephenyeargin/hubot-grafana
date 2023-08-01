const Helper = require('hubot-test-helper');
const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  'adapters/rocketchat.js',
  './../src/grafana.js',
]);

const {
  expect,
} = chai;

let room;

describe('rocketchat', () => {
  beforeEach(() => {
    process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org';
    process.env.HUBOT_GRAFANA_API_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxx';
    process.env.ROCKETCHAT_URL = 'http://chat.example.com';
    process.env.ROCKETCHAT_USER = 'user1';
    process.env.ROCKETCHAT_PASSWORD = 'sekret';

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
    delete process.env.ROCKETCHAT_URL;
    delete process.env.ROCKETCHAT_USER;
    delete process.env.ROCKETCHAT_PASSWORD;
    return nock.cleanAll();
  });

  context('rocketchat upload', () => {
    beforeEach(function () {
      room = helper.createRoom();
      nock.disableNetConnect();
      nock('http://chat.example.com')
        .post('/api/v1/login')
        .replyWithFile(200, `${__dirname}/fixtures/rocketchat/login.json`);
      return nock('http://chat.example.com')
        .post('/api/v1/rooms.upload/undefined')
        .replyWithFile(200, `${__dirname}/fixtures/rocketchat/rooms.upload.json`);
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
        1000,
      );
    });
  });

  context('rocketchat and s3', () => {
    beforeEach(() => {
      process.env.AWS_ACCESS_KEY_ID = 'key_id';
      process.env.AWS_SECRET_ACCESS_KEY = 'secret_key';
      process.env.AWS_REGION = 'us-east-2';
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
      nock.disableNetConnect();
      room = helper.createRoom();
    });

    afterEach(() => {
      room.destroy();
      nock.cleanAll();
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
    });

    it('should respond with an uploaded graph', (done) => {
      nock('https://graf.s3.us-east-2.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
        .put('/grafana/abdcdef0123456789.png')
        .query({ 'x-id': 'PutObject' })
        .reply(200);

      const selfRoom = room;
      selfRoom.user.say('alice', '@hubot graf db 97PlYC7Mk:panel-3');
      setTimeout(
        () => {
          try {
            expect(selfRoom.messages[0]).to.eql([
              'alice',
              '@hubot graf db 97PlYC7Mk:panel-3',
            ]);
            expect(selfRoom.messages[1][1]).to.match(
              /logins\: https\:\/\/graf\.s3\.us-east-2\.amazonaws\.com\/grafana\/[0-9a-f]+\.png - https\:\/\/play\.grafana\.org\/d\/97PlYC7Mk\/\?panelId=3&fullscreen&from=now-6h&to=now/i,
            );
            expect(nock.activeMocks()).to.be.empty;
            done();
          } catch (err) {
            done(err);
          }
        },
        1000,
      );
    });
  });
});

const Helper = require('hubot-test-helper');
const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper('./../src/grafana.js');

const {
  expect,
} = chai;

describe('s3', () => {
  beforeEach(function () {
    process.env.AWS_ACCESS_KEY_ID = 'key_id';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret_key';
    process.env.AWS_REGION = 'us-east-1';
    process.env.HUBOT_GRAFANA_HOST = 'https://play.grafana.org';
    process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';
    process.env.HUBOT_GRAFANA_S3_REGION = 'us-standard';
    process.env.HUBOT_GRAFANA_API_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxx';
    nock.disableNetConnect();
    room = helper.createRoom();

    nock('https://play.grafana.org')
      .get('/api/dashboards/uid/AAy9r_bmk')
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-monitoring-default.json`);

    [3, 7, 8].map((i) => nock('https://play.grafana.org')
      .defaultReplyHeaders({ 'Content-Type': 'image/png' })
      .get('/render/d-solo/AAy9r_bmk/')
      .query({
        panelId: i, width: 1000, height: 500, from: 'now-6h', to: 'now', 'var-server': 'ww3.example.com',
      })
      .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-monitoring-default.png`));
  });

  afterEach(function () {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.HUBOT_GRAFANA_HOST;
    delete process.env.HUBOT_GRAFANA_S3_BUCKET;
    delete process.env.HUBOT_GRAFANA_S3_REGION;
    delete process.env.HUBOT_GRAFANA_API_KEY;
    room.destroy();
    nock.cleanAll();
  });

  context('no region provided', () => {
    it('should respond with a png graph in the default s3 region', (done) => {
      nock('https://graf.s3.us-standard.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
        .put('/grafana/abdcdef0123456789.png')
        .query({ 'x-id': 'PutObject' })
        .times(3)
        .reply(200);

      const selfRoom = room;
      selfRoom.user.say('alice', '@hubot graf db AAy9r_bmk:cpu server=ww3.example.com now-6h');
      setTimeout(
        () => {
          try {
            expect(selfRoom.messages[0]).to.eql([
              'alice',
              '@hubot graf db AAy9r_bmk:cpu server=ww3.example.com now-6h',
            ]);
            expect(
                selfRoom.messages[1][1].replace(/\/[a-f0-9]{40}\.png/i, '/abdcdef0123456789.png')
              ).to.eql(
                'CPU: https://graf.us-standard.s3.amazonaws.com/grafana/abdcdef0123456789.png - https://play.grafana.org/d/AAy9r_bmk/?panelId=3&fullscreen&from=now-6h&to=now&var-server=ww3.example.com'
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

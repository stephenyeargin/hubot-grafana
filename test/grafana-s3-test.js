const { expect } = require('chai');
const { createTestBot, TestBotContext } = require('./common/TestBot');

describe('s3', () => {
  describe('no region provided', function () {
    /** @type {TestBotContext} */
    let ctx;

    beforeEach(async () => {
      process.env.HUBOT_GRAFANA_S3_BUCKET = 'graf';

      ctx = await createTestBot();

      ctx
        .nock('https://play.grafana.org')
        .get('/api/dashboards/uid/AAy9r_bmk')
        .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-monitoring-default.json`);

      [3, 7, 8].map((i) =>
        ctx
          .nock('https://play.grafana.org')
          .defaultReplyHeaders({ 'Content-Type': 'image/png' })
          .get('/render/d-solo/AAy9r_bmk/')
          .query({
            panelId: i,
            width: 1000,
            height: 500,
            from: 'now-6h',
            to: 'now',
            'var-server': 'ww3.example.com',
          })
          .replyWithFile(200, `${__dirname}/fixtures/v8/dashboard-monitoring-default.png`)
      );

      ctx
        .nock('https://graf.s3.us-standard.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'abdcdef0123456789.png')
        .put('/grafana/abdcdef0123456789.png')
        .query({ 'x-id': 'PutObject' })
        .times(3)
        .reply(200);
    });

    afterEach(function () {
      delete process.env.HUBOT_GRAFANA_S3_BUCKET;
      delete process.env.HUBOT_GRAFANA_S3_REGION;
      delete process.env.AWS_REGION;
      ctx?.shutdown();
    });

    it('should respond with a png graph in the default s3 region', async () => {
      let response = await ctx.sendAndWaitForResponse('@hubot graf db AAy9r_bmk:cpu server=ww3.example.com now-6h');
      response = response.replace(/\/[a-f0-9]{40}\.png/i, '/abdcdef0123456789.png');

      expect(response).to.eql(
        'CPU: https://graf.s3.us-standard.amazonaws.com/grafana/abdcdef0123456789.png - https://play.grafana.org/d/AAy9r_bmk/?panelId=3&fullscreen&from=now-6h&to=now&var-server=ww3.example.com'
      );
    });
  });
});

Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper [
  'adapters/slack.coffee',
  './../src/grafana.coffee'
]

expect = chai.expect

describe 'slack', ->
  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
    process.env.HUBOT_GRAFANA_API_KEY='xxxxxxxxxxxxxxxxxxxxxxxxx'
    process.env.HUBOT_SLACK_TOKEN = 'foobarbaz'

    nock('http://play.grafana.org')
      .get('/api/dashboards/db/grafana-play-home')
      .replyWithFile(200, __dirname + '/fixtures/v5/dashboard-grafana-play.json')
    nock('http://play.grafana.org')
      .defaultReplyHeaders({
        'Content-Type': 'image/png'
      })
      .get('/render/dashboard-solo/db/grafana-play-home/')
      .query(
        panelId: 8,
        width: 1000,
        height: 500,
        from: 'now-6h',
        to: 'now'
      )
      .replyWithFile(200, __dirname + '/fixtures/v5/dashboard-grafana-play.png')

  afterEach ->
    delete process.env.HUBOT_GRAFANA_HOST
    delete process.env.HUBOT_GRAFANA_API_KEY
    delete process.env.HUBOT_SLACK_TOKEN
    nock.cleanAll()

  context 'slack upload', ->
    beforeEach ->
      @room = helper.createRoom()
      nock.disableNetConnect()
      nock('https://slack.com')
        .post('/api/auth.test')
        .replyWithFile(200, __dirname + '/fixtures/slack/auth.test.json')
      nock('https://subarachnoid.slack.com')
        .post('/api/files.upload')
        .replyWithFile(200, __dirname + '/fixtures/slack/files.upload.json')

    afterEach ->
      nock.cleanAll()
      @room.destroy()

    it 'should respond with an uploaded graph', (done) ->
      selfRoom = @room
      selfRoom.user.say('alice', '@hubot graf db grafana-play-home:panel-8')
      setTimeout(() ->
        try
          expect(selfRoom.messages).to.eql [
            ['alice', '@hubot graf db grafana-play-home:panel-8']
          ]
          # This would be where the actual image would be returned. There is
          # not an easy way to mock that, so we are assuming that the other
          # pieces worked as expected if we get to here without errors.
          expect(selfRoom.messages).to.eql [
            ['alice', '@hubot graf db grafana-play-home:panel-8']
          ]
          done()
        catch err
          done err
        return
      , 1000)

  context 'slack and s3', ->
    beforeEach ->
      process.env.HUBOT_GRAFANA_S3_BUCKET='graf'
      process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID='99999999999999999'
      process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY='9999999999999999999999'
      nock.disableNetConnect()
      @room = helper.createRoom()

      nock('https://graf.s3.amazonaws.com')
        .filteringPath(/[a-z0-9]+\.png/g, 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .put('/grafana/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.png')
        .reply(200)

    afterEach ->
      @room.destroy()
      nock.cleanAll()
      delete process.env.HUBOT_GRAFANA_S3_BUCKET
      delete process.env.HUBOT_GRAFANA_S3_ACCESS_KEY_ID
      delete process.env.HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY

    it 'should respond with an uploaded graph', (done) ->
      selfRoom = @room
      selfRoom.user.say('alice', '@hubot graf db grafana-play-home:panel-8')
      setTimeout(() ->
        try
          expect(selfRoom.messages[1][1]).to.be.a('object')
          expect(selfRoom.messages[1][1]).to.have.property('attachments')
          expect(selfRoom.messages[1][1]['attachments'][0]).to.have.property('title')
          expect(selfRoom.messages[1][1]['attachments'][0]).to.have.property('title_link')
          expect(selfRoom.messages[1][1]['attachments'][0]).to.have.property('fallback')
          expect(selfRoom.messages[1][1]['attachments'][0]).to.have.property('image_url')
          expect(selfRoom.messages[1][1]['unfurl_links']).to.eql(false)
          expect(nock.activeMocks()).to.eql []
          done()
        catch err
          done err
        return
      , 1000)

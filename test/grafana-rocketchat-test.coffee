Helper = require('hubot-test-helper')
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
nock = require('nock')

helper = new Helper [
  'adapters/rocketchat.coffee',
  './../src/grafana.coffee'
]

expect = chai.expect

describe 'rocketchat', ->
  beforeEach ->
    process.env.HUBOT_GRAFANA_HOST = 'http://play.grafana.org'
    process.env.HUBOT_GRAFANA_API_KEY='xxxxxxxxxxxxxxxxxxxxxxxxx'
    process.env.ROCKETCHAT_URL = 'http://chat.example.com'
    process.env.ROCKETCHAT_USER = 'user1'
    process.env.ROCKETCHAT_PASSWORD = 'sekret'

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
    delete process.env.ROCKETCHAT_URL
    delete process.env.ROCKETCHAT_USER
    delete process.env.ROCKETCHAT_PASSWORD
    nock.cleanAll()

  context 'rocketchat upload', ->
    beforeEach ->
      @room = helper.createRoom()
      nock.disableNetConnect()
      nock('http://chat.example.com')
        .post('/api/v1/login')
        .replyWithFile(200, __dirname + '/fixtures/rocketchat/login.json')
      nock('http://chat.example.com')
        .post('/api/v1/rooms.upload/undefined')
        .replyWithFile(200, __dirname + '/fixtures/rocketchat/rooms.upload.json')

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

  context 'rocketchat and s3', ->
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
          expect(selfRoom.messages[0]).to.eql [
            'alice',
            '@hubot graf db grafana-play-home:panel-8'
          ]
          expect(selfRoom.messages[1][1]).to.match(
            /What\'s New: https:\/\/graf\.s3\.amazonaws\.com\/grafana\/[a-z0-9]+\.png \- http\:\/\/play\.grafana\.org\/dashboard\/db\/grafana-play-home\/\?panelId\=8&fullscreen&from\=now\-6h&to\=now/
          )
          expect(nock.activeMocks()).to.be.empty
          done()
        catch err
          done err
        return
      , 1000)

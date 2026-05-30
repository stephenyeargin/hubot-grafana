'use strict';

const { Adapter } = require('hubot');

class MockAdapter extends Adapter {
  send(envelope, ...strings) {
    this.emit('send', envelope, strings);
  }

  reply(envelope, ...strings) {
    this.emit('reply', envelope, strings);
  }

  topic(envelope, ...strings) {
    this.emit('topic', envelope, strings);
  }

  play(envelope, ...strings) {
    this.emit('play', envelope, strings);
  }

  run() {
    this.emit('connected');
  }

  close() {
    this.emit('closed');
  }
}

module.exports = { use: robot => new MockAdapter(robot) };

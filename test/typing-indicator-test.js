const { expect } = require('chai');
const { TypingIndicator } = require('../src/adapters/TypingIndicator');
const { SlackTypingIndicator } = require('../src/adapters/implementations/SlackTypingIndicator');

function fakeLogger() {
  const debugCalls = [];
  return {
    debugCalls,
    debug: (...args) => debugCalls.push(args),
  };
}

function fakeContext(room, ts) {
  return {
    envelope: { room },
    message: { rawMessage: { ts } },
  };
}

describe('typing indicator', () => {
  describe('base TypingIndicator', () => {
    it('start and stop no-op without throwing', async () => {
      const indicator = new TypingIndicator();
      await indicator.start(fakeContext('C123', '111.222'), 'is thinking...');
      await indicator.stop(fakeContext('C123', '111.222'));
    });
  });

  describe('SlackTypingIndicator', () => {
    it('calls assistant.threads.setStatus with channel_id, thread_ts, status on start', async () => {
      const calls = [];
      const robot = {
        adapter: {
          client: {
            web: {
              assistant: {
                threads: {
                  setStatus: async (opts) => calls.push(opts),
                },
              },
            },
          },
        },
      };

      const indicator = new SlackTypingIndicator(robot, fakeLogger());
      await indicator.start(fakeContext('C123', '111.222'), 'is fetching dashboard...');

      expect(calls).to.eql([{ channel_id: 'C123', thread_ts: '111.222', status: 'is fetching dashboard...' }]);
    });

    it('calls setStatus with an empty status on stop', async () => {
      const calls = [];
      const robot = {
        adapter: {
          client: {
            web: {
              assistant: {
                threads: {
                  setStatus: async (opts) => calls.push(opts),
                },
              },
            },
          },
        },
      };

      const indicator = new SlackTypingIndicator(robot, fakeLogger());
      await indicator.stop(fakeContext('C123', '111.222'));

      expect(calls).to.eql([{ channel_id: 'C123', thread_ts: '111.222', status: '' }]);
    });

    it('no-ops when setStatus is not a function (adapter/feature unsupported)', async () => {
      const robot = { adapter: {} };
      const logger = fakeLogger();
      const indicator = new SlackTypingIndicator(robot, logger);

      await indicator.start(fakeContext('C123', '111.222'), 'is fetching dashboard...');

      expect(logger.debugCalls).to.eql([]);
    });

    it('no-ops when there is no thread_ts to attach the status to', async () => {
      const calls = [];
      const robot = {
        adapter: {
          client: {
            web: {
              assistant: {
                threads: {
                  setStatus: async (opts) => calls.push(opts),
                },
              },
            },
          },
        },
      };

      const indicator = new SlackTypingIndicator(robot, fakeLogger());
      await indicator.start(fakeContext('C123', undefined), 'is fetching dashboard...');

      expect(calls).to.eql([]);
    });

    it('swallows a rejected setStatus call and logs at debug level', async () => {
      const robot = {
        adapter: {
          client: {
            web: {
              assistant: {
                threads: {
                  setStatus: async () => {
                    throw new Error('missing_scope');
                  },
                },
              },
            },
          },
        },
      };

      const logger = fakeLogger();
      const indicator = new SlackTypingIndicator(robot, logger);

      await indicator.start(fakeContext('C123', '111.222'), 'is fetching dashboard...');

      expect(logger.debugCalls).to.have.lengthOf(1);
      expect(logger.debugCalls[0][0].message).to.equal('missing_scope');
    });
  });
});

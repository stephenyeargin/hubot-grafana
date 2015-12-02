# Contributing to hubot-grafana

We are proud to have [several contributors](https://github.com/stephenyeargin/hubot-grafana/graphs/contributors) to this Hubot Script Package and want you to be one! Here are some general suggestions to help make sure your PR is merged quickly.

This follows the standard [GitHub Flow](https://guides.github.com/introduction/flow/), with some notes about working with NPM modules.

1. [Open a GitHub Issue](https://github.com/stephenyeargin/hubot-grafana/issues/new) before starting. This is a great way to get feedback from other users on your idea and helps clarify what the upcoming PR will accomplish.
2. [Fork the repository](https://github.com/stephenyeargin/hubot-grafana/fork) to your account or organization.
3. Clone the repository locally and run `npm install` to download the necessary dependancies.
4. Run the test suite with `npm test` in your cloned repository. This is to make sure you've got everything you need to get started.
5. Use `npm link` in the cloned repository and then run `nmp link hubot-grafana` in your Hubot checkout to connect your cloned version to your local Hubot install. Now you can test changes with your own data!
6. Commit and push changes back to your forked repository.
7. [Open a Pull Request](https://github.com/stephenyeargin/hubot-grafana/compare) with your repository against the parent one to submit your changes.
8. See if the the CI tests that run automatically upon opening a Pull Request pass. If not, double check your work locally with `npm test` again to resolve any issues.

Note: You won't need to do a version bump in the `package.json` file as we have a [Grunt](http://gruntjs.com) task for handling that.

## Tips

- Test coverage makes the world go round. If you add a feature or fix a bug, be sure to adjust the tests to account for it when practical.
- Configuration options are preferable to changing something globally. Many folks may depend on the current behavior (e.g. the default time window) and want to leave the default in place.
- This package is designed to work with all Hubot adapters, so we are not wanting to limit it to only folks who use Slack, HipChat, etc. See [`robot.adapterName`](https://github.com/github/hubot/pull/663) if you want to create an adapter-specific feature.
- If you find yourself copying large blocks of code, consider refactoring it to be a bit more [DRY](https://en.wikipedia.org/wiki/Don't_repeat_yourself).
- `robot.logger.debug` and `robot.logger.error` are helpful methods. You can set your `HUBOT_LOG_LEVEL` locally to see the output of these methods as your code is run.
- If you have something super custom (say, wanting to prefix every command with "hey Siri ..."), it is totally fine to fork this repository and _not_ submit back a Pull Request. You can include your forked version in Hubot by specifying the repository URL in the version field in `package.json`.

## Thank You!

You are super awesome for taking the time to contribute to Open Source Software like this project. :heart:

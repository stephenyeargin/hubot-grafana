# Grafana for Hubot

[![npm version](https://badge.fury.io/js/hubot-grafana.svg)](http://badge.fury.io/js/hubot-grafana) [![Build Status](https://travis-ci.org/stephenyeargin/hubot-grafana.png)](https://travis-ci.org/stephenyeargin/hubot-grafana)

![Screenshot](http://docs.grafana.org/img/tutorials/hubot_grafana.png)

Use Hubot to query Grafana dashboards. Inspired by the work of [`hubot-graphite`](https://github.com/github/hubot-scripts/blob/master/src/scripts/graphite.coffee) and [`hubot-graphme`](https://github.com/rick/hubot-graphme). Check out the [HOWTO](http://docs.grafana.org/tutorials/hubot_howto/) to get started with the bot.

**Note:** This package requires Grafana 2.0.2 or higher.

## Installation

In the Hubot project repo, run:

`npm install hubot-grafana --save`

Then add **hubot-grafana** to your `external-scripts.json`:

```json
[
  "hubot-grafana"
]
```

## Configuration Variables

### General Settings

| Configuration Variable           | Required | Description                    |
| -------------------------------- | -------- | ------------------------------ |
| `HUBOT_GRAFANA_HOST`             | **Yes^**  | Host for your Grafana 2.x install, e.g. `http://play.grafana.org` |
| `HUBOT_GRAFANA_API_KEY`          | _Yes^^_   | Grafana API key (This can be "Viewer" role.) |
| `HUBOT_GRAFANA_PER_ROOM`         | No       | Allow per room Grafana Host & API key configuration |
| `HUBOT_GRAFANA_QUERY_TIME_RANGE` | No       | Default time range for queries (defaults to 6h) |
| `HUBOT_GRAFANA_DEFAULT_WIDTH`    | No       | Default width for rendered images (defaults to 1000) |
| `HUBOT_GRAFANA_DEFAULT_HEIGHT`   | No       | Default height for rendered images (defaults to 500) |

^ _Not required when `HUBOT_GRAFANA_PER_ROOM` is set to 1._

^^ _Not required for `auth.anonymous` Grafana configurations. All other authentication models will require a user-specific API key._


### Image Hosting Configuration

By default, *hubot-grafana* will assume you intend to render the image, unauthenticated, directly from your Grafana instance. The limitation is that you will only receive a link to those images, but they won't appear as images in most circumstances in your chat client.

You can use one of the following strategies to host the generated images from Grafana.

- [Amazon S3](https://github.com/stephenyeargin/hubot-grafana/wiki/Amazon-S3-Image-Hosting)
- [Slack](https://github.com/stephenyeargin/hubot-grafana/wiki/Slack-Image-Hosting)
- [Rocket.Chat](https://github.com/stephenyeargin/hubot-grafana/wiki/Rocket.Chat-Image-Hosting)

### Example Configuration

```
export HUBOT_GRAFANA_HOST=http://play.grafana.org
export HUBOT_GRAFANA_API_KEY=abcd01234deadbeef01234
export HUBOT_GRAFANA_QUERY_TIME_RANGE=1h
export HUBOT_GRAFANA_S3_BUCKET=mybucket
export HUBOT_GRAFANA_S3_ACCESS_KEY_ID=ABCDEF123456XYZ
export HUBOT_GRAFANA_S3_SECRET_ACCESS_KEY=aBcD01234dEaDbEef01234
export HUBOT_GRAFANA_S3_PREFIX=graphs
```

## Sample Interaction

```
user1>> hubot graf db graphite-carbon-metrics
hubot>> Graphite Carbon Metrics: http://play.grafana.org/render/dashboard/solo/graphite-carbon-metrics/?panelId=1&width=1000&height=500&from=now-6h - http://play.grafana.org/dashboard/db/graphite-carbon-metrics/?panelId=1&fullscreen&from=now-6h
```

## Grafana Commands

### Retrieve a Dashboard

Get all panels in a dashboard. In this example, `graphite-carbon-metrics` is the slug for the given dashboard.

```
hubot graf db graphite-carbon-metrics
```

### Retrieve Specific Panels

Get a single panel of a dashboard. In this example, only the third panel would be returned. Note that this is the _visual_ panel ID, counted from top to bottom, left to right, rather than the unique identifier stored with the panel itself.

```
hubot graf db graphite-carbon-metrics:3
```

If you want to refer to the API Panel ID, use the `:panel-<identifier>` format to retrieve it. These will not change when the dashboard is re-arranged.

```
hubot graf db graphite-carbon-metrics:panel-8
```

Get all panels matching a particular title (case insensitive) in a dashboard. In this case, only panels containing `cpu` would be returned.

```
hubot graf db graphite-carbon-metrics:cpu
```

### Retrieve Dashboards in a Time Window

Specify a time range for the dashboard. In this example, the dashboard would be set to display data from 12 hours ago to now.

```
hubot graf db graphite-carbon-metrics now-12hr
```

If you don't want to show the dashboard uptil now, you can add an extra time specification, which will be the `to` time slot. In this example, the dashboard would be set to display data from 24 hours ago to 12 hours ago.

```
hubot graf db graphite-carbon-metrics now-24hr now-12hr
```

You can combine multiple commands in this format as well. In this example, retrieve only the third panel of the `graphite-carbon-metrics` dashboard with a window of eight days ago to yesterday.

```
hubot graf db graphite-carbon-metrics:3 now-8d now-1d
```

### Templated Dashboards

Grafana allows dashboards to be set up as templates and accept arguments to generate them through the API. In this example, we get a templated dashboard with the `$host` parameter set to `carbon-a`

```
hubot graf db graphite-carbon-metrics host=carbon-a
```

### Utility Commands

This command retrieves all dashboards and their slugs so they can be used in other commands.

```
hubot graf list
```

Dashboards can be tagged for easier reference. In this example, return all dashboards tagged with `production`.

```
hubot graf list production
```

Similarly, you can search the list of dashboards. In this example, return all dashboards that contain the word `elb`.

```
hubot graf search elb
```

### Per room configuration

When `HUBOT_GRAFANA_PER_ROOM` is set to '1' the following commands configure the Grafana Host and API key for the room in which the commands are issued.

```
hubot graf set host http://play.grafana.org
hubot graf set api_key abcd01234deadbeef01234
```

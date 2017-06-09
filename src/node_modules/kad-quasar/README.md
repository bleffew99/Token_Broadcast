Kad Quasar
==========

[![Build Status](https://img.shields.io/travis/kadtools/kad-quasar.svg?style=flat-square)](https://travis-ci.org/kadtools/kad-quasar)
[![Coverage Status](https://img.shields.io/coveralls/kadtools/kad-quasar.svg?style=flat-square)](https://coveralls.io/r/kadtools/kad-quasar)
[![NPM](https://img.shields.io/npm/v/kad-quasar.svg?style=flat-square)](https://www.npmjs.com/package/kad-quasar)

Publish/Subscribe extension system for [Kad](https://github.com/kadtools/kad),
based on  [Quasar](http://research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf).

Quick Start
-----------

Install kad-quasar with NPM:

```bash
npm install kad kad-quasar --save
```

Give kad-quasar your `kad.Router`:

```js
var quasar = require('kad-quasar');
var topics = new quasar.Protocol(router);

topics.subscribe('beep', function(content) {
  console.log(content); // { "message": "boop" }
});

topics.publish('beep', {
  message: 'boop'
});
```

Overview
--------

> Please note that this software is **alpha** stage and may not be suitable for
> production systems.

Kad Quasar extends [Kad](https://github.com/kadtools/kad) with a [publish/subscribe](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)
system, enabling different applications to run on the same overlay network.

To do this, Kad Quasar uses the `kad.Router` object's contact list to build an
attenuated [bloom filter](https://en.wikipedia.org/wiki/Bloom_filter) where each
filter in the series contains topics that your node and your neighbors are
subscribed to represented in "hops" from your node.

This allows each node to maintain a view of what their neighbors are interested
in 3 hops away. Published messages are relayed to neighbors probabilistically
based on this knowledge and are appended with negative information to prevent
duplication. This forms "gravity wells" in the network around groups who are
interested in a given topic and serves to prevent flooding the network while
still maintaining a high probability that the message will be delivered to all
nodes interested.

Class: Quasar(kad.Router)
-------------------------

The `Quasar` class implements [Quasar: A Probabilistic Publish-Subscribe System](http://research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf),
given an instance of `kad.Router`. It creates and manages an attenuated bloom
filter representing the different topics to which your neighboring nodes are
subscribed.

### q.publish(topic[, content])

Publishes a message to your nearest neighbors on the given `topic` (and
optional) `content` object. Those neighbors, in turn, relay the message to
their neighbors in accordance with their view of the the network.

#### Parameters

* `topic` - (String) identifier for the topic
* `content` - (Mixed) additional data describing the publication

### q.subscribe(topic[, handler])

Updates our local attenuated bloom filter to reflect our interest in the topic
and notifies our neighbors to relay publications matching the topic to us. In
turn, our neighbors will provide us with their local bloom filter, so we can do
the same.

#### Parameters

* `topic` - (String) identifier for the topic
* `handler` - (Function) receives arguments `content` with published data

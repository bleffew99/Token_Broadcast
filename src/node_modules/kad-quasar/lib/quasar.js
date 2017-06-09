'use strict';

var assert = require('assert');
var merge = require('merge');
var kad = require('kad');
var async = require('async');
var uuid = require('uuid');
var AttenuatedBloomFilter = require('atbf');
var LruCache = require('lru-cache');
var shuffle = require('knuth-shuffle').knuthShuffle;

/**
 * Implements the Quasar routing protocol given a `kad.Router`
 * @constructor
 * @param {kad.Router} router - The router instance to use
 * @param {Object} [options]
 * @param {Number} [options.lruCacheSize=50] - Max size of the publication
 * uuid cache
 * @param {Number} [options.maxRelayHops=3] - The number of hops a message
 * travels in a single direction
 * @param {Boolean} [options.randomRelay=false] - If true, don't perform
 * aggressive bloom filter update loop with neighbors before relaying
 * @see research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf
 */
function Quasar(router, options) {
  if (!(this instanceof Quasar)) {
    return new Quasar(router, options);
  }

  assert(router instanceof kad.Router, 'Invalid router supplied');

  this._router = router;
  this._options = merge(Object.create(Quasar.DEFAULTS), options);
  this._groups = {};
  this._atbf = new AttenuatedBloomFilter({
    filterDepth: 3,
    bitfieldSize: kad.constants.B
  });
  this._protocol = {};
  this._seen = new LruCache(this._options.lruCacheSize);
  this._log = this._options.logger || this._router._log;

  this._protocol[Quasar.PUBLISH_METHOD] = this._handlePublish.bind(this);
  this._protocol[Quasar.SUBSCRIBE_METHOD] = this._handleSubscribe.bind(this);
  this._protocol[Quasar.UPDATE_METHOD] = this._handleUpdate.bind(this);

  this._router._rpc.before('receive', kad.hooks.protocol(this._protocol));
  this._atbf[0].add(this._router._self.nodeID);
}

Quasar.DEFAULTS = {
  maxRelayHops: kad.constants.ALPHA,
  randomRelay: false,
  lruCacheSize: 50
};

Quasar.PUBLISH_METHOD = 'PUBLISH';
Quasar.SUBSCRIBE_METHOD = 'SUBSCRIBE';
Quasar.UPDATE_METHOD = 'UPDATE';

/**
 * Publish some data for the given topic
 * @param {String} topic - The publication identifier
 * @param {Object} data - Arbitrary publication contents
 * @param {Object} options
 * @param {String} options.target - Use neighbors close to this key (optional)
 */
Quasar.prototype.publish = function(topic, data, options) {
  var self = this;
  var nodeID = this._router._self.nodeID;
  var limit = kad.constants.ALPHA;
  var key = options ? (options.key || nodeID) : nodeID;
  var neighbors = this._router.getNearestContacts(key, limit, nodeID);

  this._log.info('publishing message on topic "%s"', topic);

  var id = uuid.v4();

  // Dispatch message to our closest neighbors
  async.each(neighbors, function(contact, done) {
    self._sendPublish(contact, {
      uuid: id,
      topic: topic,
      contents: data,
      publishers: [nodeID],
      ttl: self._options.maxRelayHops,
      contact: self._router._self
    }, function(err) {
      if (err) {
        self._log.error('failed to publish message to contact %j with ' +
                        'topic "%s", reason: "%s"', contact,
                        topic, err.message);
      }
      done(err);
    });
  });
};

/**
 * Subscribe to the given topic and handle events
 * @param {String|Array} topic - The publication identifier(s)
 * @param {Function} callback - Function to call when publication is received
 */
Quasar.prototype.subscribe = function(topic, callback) {
  var self = this;

  function _addTopicToBloomFilter(topic) {
    self._log.info('subscribing to topic "%s"', topic);
    self._atbf[0].add(topic);
    // Set a handler for when we receive a publication we are interested in
    self._groups[topic] = callback;
  }

  // Update our ABF with our subscription information, add our negative
  // information, then update our neighbors with our bloom filters
  if (Array.isArray(topic)) {
    topic.forEach(_addTopicToBloomFilter);
  } else {
    _addTopicToBloomFilter(topic);
  }

  this._sendUpdatesToNeighbors();
};

/**
 * Implements the Quasar join protocol
 * @private
 */
Quasar.prototype._sendUpdatesToNeighbors = function() {
  var self = this;
  var nodeID = this._router._self.nodeID;
  var limit = kad.constants.ALPHA;

  // Get our nearest overlay neighbors
  var neighbors = this._router.getNearestContacts(nodeID, limit, nodeID);

  this._log.debug('requesting neighbors\' bloom filters');

  // Get neighbors bloom filters and merge them with our own
  this._updateAttenuatedBloomFilter(neighbors, function() {
    // Send our neighbors our merged bloom filters
    for (var n = 0; n < neighbors.length; n++) {
      self._updateNeighbor(neighbors[n]);
    }
  });
};

/**
 * Iteratitvely update our local bloom filters with our neighbors'
 * @private
 * @param {Array} neighbors
 * @param {Function} callback
 */
Quasar.prototype._updateAttenuatedBloomFilter = function(neighbors, callback) {
  var self = this;

  // Iterate over all the given neighbors
  async.each(neighbors, function(contact, done) {
    // Ask the contact for their attenuated bloom filter
    self._getBloomFilterFromNeighbor(contact, function(err, atbf) {
      if (err) {
        self._log.warn(
          'failed to get neighbor\'s bloom filter, reason: %s',
          err.message
        );
        return done();
      }

      self._log.info('merging neighbor\'s bloom filter with our own');
      self._atbf.merge(atbf);
      done();
    });
  }, callback);
};

/**
 * Sends a PUBLISH message after verifying it has not expired
 * @private
 * @param {kad.Contact} contact
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._sendPublish = function(contact, params, callback) {
  // check to make sure the message we are sending hasn't expired:
  if (params.ttl < 1) {
    return callback(new Error('outgoing PUBLISH message has expired'));
  }

  // send the message:
  this._router._rpc.send(contact, kad.Message({
    params: merge({}, params, {
      contact: this._router._self,
      ttl: (params.ttl - 1)
    }),
    method: Quasar.PUBLISH_METHOD
  }), callback);
};

/**
 * Inspects the message and routes it accordingly
 * @private
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._handlePublish = function(params, callback) {
  /* jshint maxstatements:false */
  var self = this;
  var neighbors = this._router.getNearestContacts(
    this._router._self.nodeID,
    kad.constants.K,
    this._router._self.nodeID
  );

  // Check to make sure that we have not already seen this message
  if (this._seen.get(params.uuid)) {
    return callback(new Error('Message previously routed'));
  }

  if (params.ttl > this._options.maxRelayHops || params.ttl < 0) {
    return callback(new Error('Refusing to relay message due to invalid TTL'));
  }

  // Filter the neighbor list of previous publishers
  neighbors = shuffle(neighbors.filter(function(contact) {
    return params.publishers.indexOf(contact.nodeID) === -1;
  })).splice(0, kad.constants.ALPHA);

  // Add ourselves to the publishers (negative information)
  params.publishers.push(this._router._self.nodeID);
  this._seen.set(params.uuid, Date.now());

  // Check if we are subscribed to this topic
  // If we are, then execute our subscription handler
  if (this.isSubscribedTo(params.topic)) {
    this._groups[params.topic](params.contents, params.topic);
  }

  // Pass the publication along to our neighbors if they are subscribed
  if (this.hasNeighborSubscribedTo(params.topic)) {
    return async.each(neighbors, function(contact, done) {
      self._sendPublish(contact, params, done);
    }, callback);
  }

  // We are not interested in this message and neither are our neighbors
  // so either randomly relay or refresh our bloom filter
  this._relayPublication(neighbors, params, callback);
};

/**
 * Returns if this node is subscribed to the given topic
 * @param {String} topic
 * @returns {Boolean} isSubscribed
 */
Quasar.prototype.isSubscribedTo = function(topic) {
  return this._atbf[0].has(topic) && this._groups[topic];
};

/**
 * Returns if this node is subscribed to the given topic
 * @param {String} topic
 * @returns {Boolean} isSubscribed
 */
Quasar.prototype.hasNeighborSubscribedTo = function(topic) {
  let index = 1; // NB: Index 0 is _us_.

  while (this._atbf[index]) {
    if (this._atbf[index].has(topic)) {
      return true;
    } else {
      index++;
    }
  }

  return false;
};

/**
 * Relays the message to the given neighbors
 * @private
 * @param {Array} neighbors
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._relayPublication = function(neighbors, params, callback) {
  var self = this;
  var nodeID = this._router._self.nodeID;

  function _relayToRandomNeighbor(done) {
    var randNeighbor = self._getRandomOverlayNeighbor(nodeID, params.topic);
    self._sendPublish(randNeighbor, params, function(err) {
      if (err) {
        self._log.error('failed to relay publication to random ' +
                        'neighbor %j with topic "%s", reason: %s',
                        randNeighbor, params.topic, err.message);
      }
      if (done) {
        done(err);
      }
    });
  }

  // Ack the original sender, so they do not drop us from routing table
  callback(null, {});

  if (self._options.randomRelay) {
    return async.times(kad.constants.ALPHA,
                       (n, done) => _relayToRandomNeighbor(done));
  }

  // Get the bloom filters for all of our closest neighbors
  async.filter(neighbors, function(contact, done) {

    function _relayMessage() {
      return self._sendPublish(contact, params, function onResponse() {
        done(true);
      });
    }

    self._getBloomFilterFromNeighbor(contact, function(err, atbf) {
      if (err) {
        return done(false);
      }

      // We iterate over the total number of hops in our bloom filter
      for (var i = 0; i < self._atbf.length; i++) {

        // Check if their bloom filter for the given hop contains the topic
        if (atbf[i].has(params.topic)) {
          var negativeRT = false;

          // Check if their bloom filter contains any of the negative
          // information for the previous message publishers
          for (var p = 0; p < params.publishers.length; p++) {
            if (atbf[i].has(params.publishers[p])) {
              negativeRT = true;
            }
          }

          // If there is isn't any negative information, then let's relay the
          // message to the contact
          if (!negativeRT) {
            return _relayMessage();
          }
        }
      }

      // Nothing to do, all done
      done(false);
    });
  }, function(results) {
    if (!results.length) {
      // If none of the neighbors in the above loop should get the message
      // then we must pick a random overlay neighbor and send it to them
      _relayToRandomNeighbor();
    }
  });
};

/**
 * Inspects the message and routes it accordingly
 * @private
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._handleSubscribe = function(params, callback) {
  callback(null, { filters: this._atbf.toHexArray() });
};

/**
 * Inspects the message and routes it accordingly
 * @private
 * @param {Object} params
 * @param {Function} callback
 */
Quasar.prototype._handleUpdate = function(params, callback) {
  this._atbf.merge(AttenuatedBloomFilter.from(params.filters));
  callback(null, {});
};

/**
 * Request a copy of the contact's attenuated bloom filter (SUBSCRIBE)
 * @private
 * @param {kad.Contact} contact
 * @param {Function} callback
 */
Quasar.prototype._getBloomFilterFromNeighbor = function(contact, callback) {
  // Construct our SUBSCRIBE message
  var message = kad.Message({
    method: Quasar.SUBSCRIBE_METHOD,
    params: { contact: this._router._self }
  });
  var bloomFilter = null;

  this._router._rpc.send(contact, message, function(err, message) {
    if (err) {
      return callback(err);
    }

    if (!message.result.filters) {
      return callback(new Error('Invalid response received'));
    }

    if (!Array.isArray(message.result.filters)) {
      return callback(new Error('Invalid response received'));
    }

    try {
      bloomFilter = AttenuatedBloomFilter.from(message.result.filters);
    } catch (err) {
      return callback(new Error('Failed to deserialize bloom filter'));
    }

    callback(null, bloomFilter);
  });
};

/**
 * Send the contact our updated attenuated bloom filter
 * @private
 */
Quasar.prototype._updateNeighbor = function(contact) {
  var self = this;

  // Construct our UPDATE message
  var message = kad.Message({
    method: Quasar.UPDATE_METHOD,
    params: {
      filters: this._atbf.toHexArray(),
      contact: this._router._self
    }
  });

  this._router._rpc.send(contact, message, function(err) {
    if (err) {
      self._log.warn('failed to update neighbor with bloom filter');
    }
  });
};

/**
 * Returns a random contact for the given topic
 * @private
 * @param {String} nodeID
 * @param {String} topic
 * @returns {kad.Contact}
 */
Quasar.prototype._getRandomOverlayNeighbor = function(nodeID, topic) {
  var randIndex = kad.utils.getBucketIndex(nodeID, kad.utils.createID(topic));
  var randBucket = kad.utils.getRandomInBucketRangeBuffer(randIndex);
  var randKey = kad.utils.createID(randBucket);

  return shuffle(
    this._router.getNearestContacts(randKey, kad.constants.K, nodeID)
  )[0];
};

module.exports = Quasar;

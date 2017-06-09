/**
 * @module kad-quasar/example/simple
 */

'use strict';

// Import kad and kad-quasar
const kad = require('kad');
const Quasar = require('kad-quasar').Protocol;

// Setup storage adapter and logger
var logger = new kad.Logger(4);
var storage = new kad.storage.MemStore();

// Create our node's contact object
var contact = new kad.contacts.AddressPortContact({
  address: '127.0.0.1',
  port: 1337
});

// Initialize our transport adapter
var transport = new kad.transports.UDP(contact, {
  logger: logger
});

// Explicity define router (instead of letting `Node` create one)
var router = new kad.Router({
  transport: transport,
  logger: logger
});

// Give our router to kad-quasar
var topics = new Quasar(router);

// Setup our kad node
var node = new kad.Node({
  transport: transport,
  router: router,
  logger: logger,
  storage: storage
});

// Define a known seed node
var seed = { address: '127.0.0.1', port: 1338 };

// Join the network
node.connect(seed, function() {

  // Listen for publications
  topics.subscribe('beep', function(content) {
    console.log('beep: %j', content);
  });

  // Publish content to the network
  topics.publish('boop', {
    some: 'data'
  });

});

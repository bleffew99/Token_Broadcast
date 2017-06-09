const Bot = require('./lib/Bot')
const SOFA = require('sofa-js')
const Fiat = require('./lib/Fiat')

// config time
var startDate = new Date();
var startMinutes = startDate.getMinutes();

var date
var minutes

// configure twitter stuff
const Twit = require('twit')



let bot = new Bot()
const twitterBot = new Twit({
  consumer_key:         '7zNXlyxBkpfD7kTYAVj66Lxv1',
  consumer_secret:      'scPEFtm19NTbNnfGc6Frh0iOo3vNN1UEGw43XqlsEZ8pdfnn2Z',
  access_token:         '872565381361274881-mGQ8UfexwstCn6WKIEXaREWy2gqTSqg',
  access_token_secret:  'vSbfEch2SgbGi7oF1RBdtVuEEz5WBIJSYfKrIxNjbQEI0',
})

// downoad current bid, set to local value
var bids = [{
  bid: 0.005,
  tweet: 'No one bidded on this message :(',
  tokenId:''
}];
var highestBid

var newTweet = ''
var newBid = 0
var newTokenId = ''


// check time, then send tweet if time has run out
bot.onEvent = function(session, message) {
    switch (message.type) {
      case 'Init':
        session.set('userBid', userBid)
        welcome(session)
        break
      case 'Message':
        onMessage(session, message)
        break
      case 'Command':
        onCommand(session, message)
        break
      case 'Payment':
        onPayment(session, message)
        break
      case 'PaymentRequest':
        welcome(session)
        break
    }
}

function onMessage(session, message) {
  // check if time to bid has run out
  highestBid = findHighestBid()
  console.log(highestBid)
  date = new Date()
  minutes = date.getMinutes()

  if((minutes - 5) % 60 >= startMinutes) {
    startMinutes = minutes
      // user lost bid
      session.reply("Times up! The winning message was \"" + highestBid.tweet + "\"!")
      // refund money
      var bidsToRefund = 0
      for (var i = 0; i < bids.length; i++) {
        if (bids[i].tokenId == session.get('tokenId') && bids[i].bid < highestBid.bid) {
          bidsToRefund += bids[i].bid
        }
      }
      if (bidsToRefund > 0)
        session.sendEth(bidsToRefund)
      tweet()
    }
  // set new message
  if (session.get('askingForMessage')) {
    session.set('askingForMessage', false)
    // update object for session
    newTweet = message.body
    newTokenId = session.get('tokenId')
    // then add to array of bids
    bids.push({
      bid: newBid,
      tweet: newTweet,
      tokenId: newTokenId
    })

    session.reply('New message is now "' + newTweet + '"')
    highestBid = findHighestBid()
    welcome(session)
  }

  // set new bid
  else if (session.get('askingForBid')) {
    //make sure bid is valid

    if (parseFloat(message.body) > highestBid.bid && !isNaN(message.body)) {
      // all good
      session.set('newBid', parseFloat(message.body))
      session.set('askingForBid', false)
      session.requestEth(message.body)
    }
    else {
      // not good
      session.reply("I'm sorry, but the bid you entered was invalid. (Must be only number)")
      session.set('askingForBid', false)
    }
  }

  // else normal message
  else {
    welcome(session)
  }
}

function onCommand(session, command) {
  highestBid = findHighestBid()
  switch (command.content.value) {
    case 'bid':
      bid(session)
      break
    case 'donate':
      donate(session)
      break
    case 'display':
      display(session)
      break
    }
}

function onPayment(session, message) {
  if (message.fromAddress == session.config.paymentAddress) {
    // handle payments sent by the bot
    if (message.status == 'confirmed') {
      // perform special action once the payment has been confirmed
      // on the network
    } else if (message.status == 'error') {
      // oops, something went wrong with a payment we tried to send!
    }
  } else {
    // handle payments sent to the bot
    if (message.status == 'unconfirmed') {
      // payment has been sent to the ethereum network, but is not yet confirmed
      // ask for tweet
      newBid = session.get('newBid')
      getTweet(session)
    } else if (message.status == 'confirmed') {
      // handle when the payment is actually confirmed!
      // ask user for tweet

    } else if (message.status == 'error') {
      sendMessage(session, `There was an error with your payment!🚫`);
    }
  }
}

// askingForMessageS

function welcome(session) {
  var minutesLeft = 5 - ((minutes - 5) % 60 - (startMinutes - 5) % 60)
  session.reply(`Hi, welcome to Token_Broadcast!`)
  session.reply('My function is to create an open and free marketplace where users can bid to get their message pushed to an AdSpace on Twitter')
  sendMessage(session, 'The current bid is currently ' + highestBid.bid + 'ETH' + " with " + minutesLeft + " minutes left")
}

// sends new bid for tweet
function bid(session) {
  session.set('askingForBid', true)
  session.reply('Current bid is ' + highestBid.bid + " ETH. Enter a new bid.")
}

// get new tweet from user, update current bid
function getTweet(session) {
  session.set('askingForMessage', true)
  session.reply("What is your message?")
}

// display current bid and message
function display(session) {
  session.reply("Current bid is " + highestBid.bid)
  session.reply('Current tweet is "' + highestBid.tweet + '"')
}

// tweet out current message
function tweet(session) {

  // reset bid


  twitterBot.post('statuses/update', { status: highestBid.tweet }, function(err, data, response) {
  console.log(data)
  })
  // reset bids
  bids = [{
    bid: 0.005,
    tweet: 'No one bidded on this message :(',
    tokenId:''
  }];

}

// HELPERS
function findHighestBid() {
  var currhighestbid = bids[0]
  for (var i = 0; i < bids.length; i++) {
    if (bids[i].bid > currhighestbid.bid) {
      currhighestbid = bids[i]
    }
  }
  return currhighestbid
}


function sendMessage(session, message) {
  let controls = [
    {type: 'button', label: 'Bid', value: 'bid'},
    {type: 'button', label: 'Top Offer', value: 'display'},
    {type: 'button', label: 'Twitter', action: 'Webview::https://twitter.com/Token_Broadcast'}
  ]
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}

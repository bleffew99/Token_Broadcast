<h5><i>For a full description of the Token_Broadcast bot, check out our <b><a href='https://medium.com/@kleffew/tokenbroadcast-cf9963b54d99'>press-release</a></b>, found at https://medium.com/@kleffew/tokenbroadcast-cf9963b54d99</i></h5>

# Token_Broadcast

<br>
<h2>Abstract:</h2>
<p>The <b>vision</b> for Token_Broadcast is simply:</p>
“To allow owners of AdSpaces to create engaging marketplaces where advertisers compete for the attention of users in a way which is transparent, non-discriminatory, and programmatically verifiable.”

---
<br>
<p>For the <b><a href='https://www.tokenbrowser.com/'>June 2017 Token Hackathon</a></b>, Brian Leffew and I elected to assemble a ‘bot’ on the Token Browser named “Token_Broadcast”.</p>
<p>The bot implements an open-market bidding mechanism, allowing users to compete for the transmission of message onto an AdSpace.</p>
<p>At the end of the time interval, the user with the highest bid wins, and gets their message pushed onto both the AdSpace and other bidders. Simultaneously, a smart-contract reimburses the non-winners with their original funds.</p>
<p>While the message could be easily redesigned to be pushed onto any external network, our proof-of-concept MVP uses a Twitter handle, <a href='https://twitter.com/Token_Broadcast'>@Token_Broadcast</a>, to push the winning message onto the Twitterverse</p>
<br>

---

<br>
<br>
<h3>The mechanics of the UX are rather simple:</h3>
<ol>
  <li>First, the user initiates a conversation with Broadcast_Bot on Token, using any ol’ string to get the conversation rolling</li>
  <li>Next, Broadcast_Bot follows up with an introduction, then uses SOFA UI elements to ask the user to either bid, donate, or display</li>
  <li>If the User decides to bid, she enters a value amount, which is listed in local currency and recorded in Ethereum.</li>
  <li>If the bid is valid (i.e.- greater than the previous highest bid), the bot accepts it, asking the user “What is the message you’d like to Broadcast?”</li>
  <li>After the bot recieves the submission, it is recorded and stored as a JSON object</li>
  <li>If the bid associated with message remains the highest at the end of the cycle — it is pushed through the Twitter API and tweeted out</li>
</ol>
<br>
<br>

---

<h2>Example UI Flow</h2>
<p align="center">
  <img src="https://github.com/bleffew99/Token_Broadcast/blob/master/UI%20Flow%20Assets/IMG_3567.PNG" width="350"/>
  <img src="https://github.com/bleffew99/Token_Broadcast/blob/master/UI%20Flow%20Assets/IMG_3578.PNG" width="350"/>
  <img src="https://github.com/bleffew99/Token_Broadcast/blob/master/UI%20Flow%20Assets/IMG_3572.PNG" width="350"/>
  <img src="https://github.com/bleffew99/Token_Broadcast/blob/master/UI%20Flow%20Assets/IMG_3574.PNG" width="350"/>
  <img src="https://github.com/bleffew99/Token_Broadcast/blob/master/UI%20Flow%20Assets/IMG_3577.PNG" width="350"/>
</p>

---

<h5><i>For a full description of the Token_Broadcast bot, check out our <b><a href='https://medium.com/@kleffew/tokenbroadcast-cf9963b54d99'>press-release</a></b>, found at https://medium.com/@kleffew/tokenbroadcast-cf9963b54d99</i></h5>

# att.js

Client library for turning your browser into a phone.

For more info/demos visit: https://js.att.io

## How to Make a Phone Call

```js
var att = $.att({
  // we just pass our accessToken
  apiKey: "YOUR ACCESS TOKEN",
  // specify what we want to do when
  // we're ready to make calls
  onReady: function () {
    window.activeCall = att.phone.dial('1-800-444-4444');
  },
  phone: {
    onIncomingCall: function (call) {
      window.activeCall = call;
      // auto answer
      call.answer();
    }
  }
});

```

## Configuring att.js

The configuration settings for att.js are:

* `apiKey`: Your OAuth access token. 
* `ringTone`: A URL of an audio file to use a ring tone for incoming calls.
* `ringbackTone`: A URL of an audio file to use while waiting for a call to be answered.
* `log`: Defaults to `true` to include verbose console log output.

Additionally, there are several callback hooks for managing a call's lifecycle:

* `onReady`
* `onUnReady`
* `onError`
* `onCalling`
* `onCallBegin`
* `onCallEnd`
* `onIncomingCalli`
* `onOutgoingCall`

Each of which is called with a call object.

When specifying the callbacks, you may either include them directly as so:

```js
var att = $.att({
  apiKey: "YOUR ACCESS TOKEN",
  onReady: function () {
    window.activeCall = att.phone.dial('1-800-444-4444');
  },
  onIncomingCall: function (call) {...}
  onCallEnd: function (call) {...}
});
```

or you may follow the convention for the Phono API by putting the
callbacks in a `phone` dictionary:

```js
var att = $.att({
  apiKey: "YOUR ACCESS TOKEN",
  onReady: function () {
    window.activeCall = att.phone.dial('1-800-444-4444');
  },
  phone: {
    onIncomingCall: function (call) {...}
    onCallEnd: function (call) {...}
  }
});
```

## Creating and Interacting with a Call

To start a call, you can use `att.dial()`:

```js
var att = $.att({...});
var call = att.dial('18005555555', {
    onAnswer: function () {...}
});
```

You may also pass additional callbacks specific for the call. These are:

* `onRing`
* `onAnswer`
* `onHangup`
* `onError`

Once a call object has been created, you can control and interact with the call
session using:

* `call.answer()`: Accept an incoming call.
* `call.hangup()`: End the call.
* `call.digit(number)`: The equivalent of pressing a phone key during a call.
* `call.mute(flag)`: Mute or unmute the call.
* `call.hold(flag)`: Place the call on hold, or remove it from hold.
* `call.volume(level)`: Set the volume level for the call.
* `call.gain(level)`: Set the gain for the call.
* `call.transferto(phoneNumber)`: Transfer the call to another phone
* `call.pushToTalk(flag)`: If set to `true`, enable push to talk functionality. You will have to use `call.talk(true)` to enable sending audio, and `call.talk(false)` when done. If no value is provided, the function will return `true` if the call is in push to talk mode.
* `call.talking(flag)`: The equivalent of pressing the talk button on a push to talk device.

# Working with Phone Numbers

If you want to clean and sanitize a user provided phone number to the standard US format, 
you can use:

```js
var number = $.att.phoneNumber.stringify('800555555');
```

## Contributing to this library
### Prerequisits

- Node.js 0.8.16
- npm

### Steps

1. install dependencies:

```
npm install .
```

2. Make edits in `/src`

3. build att.js and minified version

```
node build.js
```

## Credits

[The AT&T Foundry](https://foundry.att.com/)

### Developers

- [Henrik Joreteg](http://andyet.com/team/henrik/) – [&yet](http://andyet.com)
- Geoff Hollingsworth – Ericsson

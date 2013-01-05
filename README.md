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

To start a call, you can use `att.dial()`, or the equivalent `att.phone.dial()`:

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

Once you answer a call, you can find the number of the caller in the `call.initiator` field.

# Working with Phone Numbers

If you want to clean and sanitize a user provided phone number to the standard US format, 
you can use:

```js
var number = $.att.phoneNumber.stringify('800555555');
```

You can also parse numbers like so:
```js
var number = $.att.phoneNumber.stringify('1 (800) CALL-ATT');
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
[Phono](http://phono.com)

### Developers

- [Henrik Joreteg](http://andyet.com/team/henrik/) – [&yet](http://andyet.com)
- Geoff Hollingsworth – Ericsson

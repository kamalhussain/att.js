# att.js

Client library for turning your browser into a phone.

For more info/demos visit: https://js.att.io

```js
var att = new ATT({apiKey: "YOUR ACCESS TOKEN"});
att.on('phoneReady', function () {
    att.dial('1-8000-444-4444');
});

att.on('incomingCall', function (call) {
    call.answer();
});

att.on('callBegin', function (call) {
    // An outgoing call has been answered
});

att.on('callEnd', function (call) {
    // The call has been hung up
});

```

## Configuring att.js

The core of `att.js` is an event emitter, which collects all of events from 
loaded plugins in a single place.

### Core Events

* `init`

### User Events

* `authorized`
* `user`

### Phone Events

* `phoneReady`
* `incomingCall`
* `outgoingCall`
* `calling`
* `callBegin`
* `callEnd` 
* `ring`
* `error`

You may add a handler for an event by using:

```js
att.on('EVENT_NAME', function (eventData) {
    // do stuff with eventData
});
```

The configuration settings for att.js are:

* `apiKey`: Your OAuth access token. 
* `log`: Defaults to `true` to include verbose console log output.

## Creating and Interacting with a Call

To start a call, use `att.dial()`, after the `phoneReady` event has been fired:

```js
var att = new ATT({...});
att.on('phoneReady', function () {
    var call = att.dial('18005555555');
    call.on('callBegin', function () {
        // The call has been answered
        // ...
        call.hangup();
    });
});
```

The available call events are:

* `incomingCall`
* `outgoingCall`
* `callBegin`
* `callEnd`
* `error`

Once a call object has been created, you can control and interact with the call
session using:

* `call.answer()`: Accept an incoming call.
* `call.hangup()`: End the call.

Once you answer a call, you can find the number of the caller in the `call.initiator` field.

## Working with Phone Numbers

If you want to clean and sanitize a user provided phone number to the standard US format, 
you can use:

```js
var number = att.phoneNumber.stringify('800555555');
```

You can also parse numbers like so:
```js
var number = att.phoneNumber.stringify('1 (800) CALL-ATT');
```

## Creating an att.js Plugin
Plugins for att.js follow the jQuery pattern, and look like:

```js
(function (ATT) {
    // To make things shorter, ATT.fn === ATT.prototype
    
    // Add new plugin object:
    ATT.fn.examplePlugin = {
        usefulFunction: function () {
        }
    };

    // Or add a function directly to the ATT object:
    ATT.fn.directFunction = function () {
    };

    // If the plugin requires registering any event handlers,
    // a call to ATT.initPlugin must be made to get a reference
    // to the instantiated ATT object.
    ATT.initPlugin(function (att) {
        // The 'init' event will be fired after all plugins which
        // use ATT.initPlugin have been instantiated.
        att.on('init', function () {
            // ...
        });
    });
})(ATT);
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
- [Lance Stout](http://andyet.com/team/lance/) – [&yet](http://andyet.com)
- Kamal Hussain - Alcatel-Lucent

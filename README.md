# att.js

Client library for turning your browser into a phone.

For more info/demos visit: https://js.att.io

```js
var att = new ATT({accessToken: "YOUR ACCESS TOKEN"});
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

## Documentation
* [Architectural Overview](docs/architecture.md)
* [Plugin Interfaces](docs/plugins.md)

## Configuring att.js

The core of `att.js` is an event emitter, which collects all of events from 
loaded plugins in a single place.

### Core Events

* `init`

### User Events

* `accessToken`
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

* `accessToken`: Your OAuth access token. 
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
* `callError`

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

1. Install dependencies:

        npm install .

2. Make edits in `/src`

3. Build documentation

        npm run-script build

4. Test

  Uses qunit for testing in the browser

        open testing/index.html 

## Specs

In order to automatically generate useful documentation for all att.js plugins, a plugin should provide a spec file describing the methods it provides, and any events it emits. An example spec file that uses all of the available features would look like:

      {
          "plugin": "my.plugin",
          "description": "A demo plugin for demonstrating spec files",
          "methods": {
              "runFoo": {
                  "description": "Calculates and returns foo directly, and via a callback.",
                  "parameters": [
                      {"name": "InitialValue", "type": "BarData"}
                  ],
                  "returns": "BarData",
                  "callbackArgs": [
                      {"name": "SomeOutputValue", "type": "BarData"}
                  ]
              }
          },
          "events": {
              "success": {
                  "description": "Things worked!",
                  "args": [
                      {"name": "ResultCode", "type": "string"}
                  ]
              },
              "failed": {
                  "description": "Things didn't work",
                  "args": [
                        {"name": "ResultCode", "type": "string"}
                  ]
              },
              "pong": {
                  "description": "Ping Pong!"
              }
          },
          "datatypes": {
              "BarData": {
                  "description": "A dictionary of data about bar",
                  "methods": {
                      "ping": {
                          "description": "Ping something"
                      }
                  },
                  "events": [
                      "pong"
                  ]
              }
          }
        }

The `npm run-script build` command will compile all `.spec` files in the source directory into a single `att.spec.js` file, which can be included like any other ATT.js plugin. This can be useful for building an introspection tool, or for validating plugin behaviour against the defined spec.

## Testing

Testing is done through [QUnit](http://qunitjs.com/) test suites which run in the browser.
Test suites are placed in `testing/tests` and then referenced in `testing/index.html`. 

For example, a basic test suite looks like:

      module('foo');

      test("Ensure that runFoo returns BarData", function() {
          // How many assertions to expect during this test
          expect(2);

          var att = new ATT();

          att.on('success', function (result) {
              equal(result, 'OK');
          });

          att.runFoo({}, function (barData) {
              equal(barData, {a: 1});
          });
      });

For more details on how to write tests, see the [QUnit documentation](http://qunitjs.com).

After saving the test suite in `testing/tests/foo.js` the `testing/index.html` file is updated to include both the plugin being tested, and the test suite:

      <!DOCTYPE html>
      <html>
          <head>
              <meta charset="utf-8">
              <title>att.js core tests</title>
              <link rel="stylesheet" href="qunit.css">
          </head>
          <body>
              <div id="qunit"></div>
              <div id="qunit-fixture"></div>
              <script src="qunit.js"></script>
              <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
              <!-- the scripts we're testing -->
              <script src="../src/att.js"></script>
              ...
              <script src="../src/foo.js"></script><!-- The plugin to test -->
      
              <!-- the tests -->
              <script src="tests/core.js"></script>
              <script src="tests/phoneNumber.js"></script>
              ...
              <script src="tests/foo.js"></script><!-- The test suite -->
          </body>
      </html>       

Running the entire collection of test suites is done by opening `testing/index.html` in the browser version you wish to test against.

## Credits

- [The AT&T Foundry](https://foundry.att.com/)
- [Phono](http://phono.com)

### Developers

- [Henrik Joreteg](http://andyet.com/team/henrik/) – [&yet](http://andyet.com)
- Geoff Hollingsworth – Ericsson
- [Lance Stout](http://andyet.com/team/lance/) – [&yet](http://andyet.com)
- Kamal Hussain - Alcatel-Lucent
- Thao Nguyen  - WCG


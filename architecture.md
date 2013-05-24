# ATT.js Architecture

ATT.js is an event emitter framework, which allows for plugins to interact via events using ATT.js as a message bus.

The goal is that various user interface components can register handlers for standardized events, and not have to worry about the low level implemenation of the phone service or which vendor backend is used.

    UI Components (dial pad, call control bar, etc)
                        |
                        |
                      ATT.js
                        |
                        |
                Vendor Phone Plugin


By using the event pattern, multiple handlers may be registered for a single action, instead of a single callback function. This allows for multiple UI components to be easily kept in sync without coupling.


Including plugins is done by inserting additional `<script />` tags after the main `att.js` script:

    <script src="att.js" />
    <script src="att.me.js />
    <script src="att.phonenumber.js" />
    ...

## Creating a Plugin

An ATT.js plugin works similarly to a jQuery plugin, extending the core `ATT` object with new methods and properties. 


1. The basic plugin wrapper:

  An ATT.js plugin uses a closure to limit leaking variables into the global scope. The basic plugin looks like:

        (function (ATT) {
        })(ATT);

2. Adding a new method on the root `ATT` object.

  The field `ATT.fn` is equivalent to `ATT.prototype`, and can be extended to add new methods to the root `ATT` object.

        (function (ATT) {
            ATT.fn.rootMethod = function () {
                // useful things
            };
        })(ATT);

  Plugins should attempt to avoid root level methods as much as possible, so that only common, standardized methods are
  available from the root object.

3. Adding new namespaced methods to the `ATT` object.

  To prevent naming conflicts between plugins, new methods can be included in a custom namespace for the plugin.

        (function (ATT) {
            ATT.fn.myPlugin = {
                usefulFunction: function () {
                },
                another: function () {
                }
            };
        })(ATT);

  You can then access your plugin methods using:

        var att = new ATT({...});
        att.myPlugin.usefulFunction();

4. Handling events

  While adding new functionality to the `ATT` object is easily done by extending `ATT.fn`, handling events requires access to the actual object you instantiate when you call `var att = new ATT({...});`. To get access to the instantiated object, the `ATT.initPlugin` method is used.

        (function (ATT) {
            ATT.initPlugin(function (att) {
                att.on('init', function () {
                    // setup the plugin
                });
            });
        })(ATT);
      
  The `ATT.initPlugin` method is called during instantiation in `new ATT({...})`, allowing plugins to have direct access to the initialized object so that event handlers may be registered. Once all of the callback functions passed to `ATT.initPlugin` have been called, the `init` event will be emitted, signalling that the `ATT.js` framework has been loaded. If a plugin requires access to features provided by another plugin in order to complete its setup and configuration, it must wait for the `init` event to ensure that the other plugin has been loaded.

## Standard Plugins
### Me Plugin

The `att.me` plugin provides an easy way to retrieve a user's AT&T profile information, including name and phone number.

#### Methods

- `att.getMe()`

  Makes an AJAX request to retrieve the user's profile information.

  Returns a JSON dictionary.

#### Events

- `user`, with JSON user profile

  Raised when the user's profile information has been retrieved.

  It is suitable for other plugins to listen for the `user` event in order to finish their own initialization steps.

#### Example

    var att = new ATT({apiKey: APIKEY});
    var user = att.getMe();
  

### Phone Number Plugin

The `att.phonenumber` plugin is a set of helper function for parsing and processing phone number strings.

- `att.phonenumber.stringify(phoneNumberStr)`

  Formats a phone number string to include dashes and parenthesis.


- `att.phonenumber.parse(phoneNumberStr)`

  Converts a phone number that uses letters into the equivalent number using all digits.


- `att.phonenumber.getCallable(phoneNumberStr, countryCode)`

  Parses a raw string to extract a callable phone number. An optional country code may be specified to determine the callable format. The default country code is `us`.


### Phone Plugin

There are several implementations for the phone plugin, based on different vendor backends. However, they all follow the same generic interface so that you as the end developer don't have to worry about which one is used.

### Methods

- `att.dial(phoneNumber)`

  Used to dial a number and make an outgoing call. A `Call` object is returned, but will also be emitted in an `outgoingCall` event.

### Events

- `phoneReady`

  Raised when the phone backend has been initialized and is ready to make or receive calls.

- `calling`, with phone number string

  Emitted with the phone number that has been dialed for an outgoing call.

- `outgoingCall`, with `Call` object

  Raised whenever a phone number has been dialed using `att.dial()` to make an outgoing call.

- `incomingCall`, with `Call` object

  Raised whenever a request to accept an incoming phone call has been received.

- `ring`

  A signal that a call request is in progress.

- `callBegin`, with `Call` object

  Raised when a call has been answered by both sides and is ready for use.

- `callEnd`, with `Call` object

  Raised when the call session has been ended by either party.

- `error`, with `Call` object

  Emitted when an error has occured while establishing or maintaining a call.

### The Call Object

A phone call session, which may be answered or hung up.

- `call.answer()`

  Accept and answer an incoming phone call.

- `call.hangup()`

  Decline an incoming call, or end an active call.

### Examples

    var att = new ATT({...});
    att.on('phoneReady', function () {
        att.dial('18005555555');
    });

    att.on('outgoingCall', function (call) {
        // display the ringing UI
    });

    att.on('incomingCall', function (call) {
        call.answer();
    });

    att.on('callBegin', function (call) {
        // display the active call UI

        // ... and eventually
        call.hangup();
    });

    att.on('callEnd', function (call) {
        // remove the active call UI
    });

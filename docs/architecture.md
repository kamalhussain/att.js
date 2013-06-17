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

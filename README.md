# att.js

Client library for turning your browser into a phone.

For more info/demos visit: https://js.att.io

## How to make a Phone Call

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

[Henrik Joreteg](http://andyet.com/team/henrik/) – [&yet](http://andyet.com)
Geoff Hollingsworth – Ericsson

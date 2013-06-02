# ATT.js Plugin Documentation

## The att.me plugin

Helper method for retrieving a user's ATT profile information.

### Methods

  - getMe()

    Make an AJAX request to retrieve the user's profile information.

### Events

  - <a id="att.me-event-user"></a>user, called with: [UserProfile](#att.oauth2-datatype-UserProfile)

    Raised when the user's profile information has been retrieved. Suitable for other plugins to listen for to finish their own initialization steps

## The att.oauth2 plugin

This plugin allows easy user login and authorization from the att oauth system

### Methods

  - authorizeURL()

    Returns an oauth authorize url for the configured client.
  - login()

    Validated accessToken or updates elements with btn-att-login class with authroizeURL to fetch an accessToken.

### Events

  - <a id="att.oauth2-event-authorized"></a>authorized

    Raised an accesstoken is present in the url hash_fragement and an access_token is validatedd.

## The att.phone.generic plugin

Common interface for making and receiving phone calls.

### Methods

  - dial(string)

    Dial a number and make an outgoing call.

### Events

  - <a id="att.phone.generic-event-phoneReady"></a>phoneReady

    Raised when the phone backend has been initialized and is ready to make or receive calls

  - <a id="att.phone.generic-event-calling"></a>calling, called with: string

    Raised with the phone number be dialed on an outgoing call.

  - <a id="att.phone.generic-event-outgoingCall"></a>outgoingCall, called with: [Call](#att.phone.generic-datatype-Call)

    Raised with a Call object for managing an outgoing call.

  - <a id="att.phone.generic-event-incomingCall"></a>incomingCall, called with: [Call](#att.phone.generic-datatype-Call)

    Raised with a Call object for managing an incoming call.

  - <a id="att.phone.generic-event-ring"></a>ring

    A signal that a call request is in progress.

  - <a id="att.phone.generic-event-callBegin"></a>callBegin, called with: [Call](#att.phone.generic-datatype-Call)

    Raised when a call has been answered and is ready for use.

  - <a id="att.phone.generic-event-callEnd"></a>callEnd, called with: [Call](#att.phone.generic-datatype-Call)

    Raised when a call has been hung up.

  - <a id="att.phone.generic-event-error"></a>error, called with: [Call](#att.phone.generic-datatype-Call)

    Emitted when an error has occured while establishing or during a call.

## The att.phonenumber plugin

A set of helper functions for parsing and processing phone number strings.

### Methods

  - stringify(string)

    Format a phone number to include dashes and parenthesis.
  - parse(string)

    Convert a phone number that uses letters into numeric format.
  - getCallable(string, string)

    Parses a phone number string into a callable format.

## Data Types

### <a id="att.oauth2-datatype-UserProfile"></a>UserProfile

A dictionary of profile information for a user, including name and phone number.

### <a id="att.phone.generic-datatype-Call"></a>Call

A phone call session, which may be answered or hung up.

### Methods

  - answer()

    Accept and answer an incoming phone call.
  - hangup()

    Decline, or end an existing, phone call

## Event Index

### user
  - [att.me](att.me)

### authorized
  - [att.oauth2](att.oauth2)

### phoneReady
  - [att.phone.generic](att.phone.generic)

### calling
  - [att.phone.generic](att.phone.generic)

### outgoingCall
  - [att.phone.generic](att.phone.generic)

### incomingCall
  - [att.phone.generic](att.phone.generic)

### ring
  - [att.phone.generic](att.phone.generic)

### callBegin
  - [att.phone.generic](att.phone.generic)

### callEnd
  - [att.phone.generic](att.phone.generic)

### error
  - [att.phone.generic](att.phone.generic)

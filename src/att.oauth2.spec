{
    "plugin": "att.oauth2",
    "description": "This plugin allows easy user login and authorization from the att oauth system",
    "methods": {
        "authorizeURL": {
            "description": "Returns an oauth authorize url for the configured client.",
            "parameters": [],
            "callbackArgs": [
                {"type": "UserProfile"}
            ]
        },
        "login": {
            "description": "Validated accessToken or updates elements with btn-att-login class with authroizeURL to fetch an accessToken.",
            "parameters": [],
            "callbackArgs": [
                {"type": "UserProfile"}
            ]
        }
    }
}

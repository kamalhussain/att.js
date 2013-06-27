{
    "plugin": "att.oauth2",
    "description": "This plugin allows easy user login and authorization from the att oauth system",
    "methods": {
        "att.oauth2.authorizeURL": {
            "description": "Returns an oauth authorize url for the configured client.",
            "parameters": [],
            "callbackArgs": [
                {"type": "UserProfile"}
            ]
        },
        "att.oauth2.login": {
            "description": "Validated accessToken or updates elements with btn-att-login class with authroizeURL to fetch an accessToken.",
            "parameters": [],
            "callbackArgs": [
                {"type": "UserProfile"}
            ]
        }
    }
}

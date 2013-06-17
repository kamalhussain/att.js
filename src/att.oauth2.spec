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
    },
    "events": {
        "authorized": {
            "description": "Raised an accesstoken is present in the url hash_fragement and an access_token is validatedd."
        }
    },
    "datatypes": {
        "UserProfile": {
            "description": "A dictionary of profile information for a user, including name and phone number."
        }
    }
}

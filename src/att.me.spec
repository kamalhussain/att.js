{
    "plugin": "att.me",
    "description": "Helper method for retrieving a user's ATT profile information.",
    "methods": {
        "att.getMe": {
            "description": "Make an AJAX request to retrieve the user's profile information.",
            "parameters": [],
            "callbackArgs": [
                {"type": "UserProfile"}
            ]
        }
    },
    "events": {
        "user": {
            "description": "Raised when the user's profile information has been retrieved. Suitable for other plugins to listen for to finish their own initialization steps",
            "args": [
                {"type": "UserProfile"}
            ]
        }
    },
    "datatypes": {
        "UserProfile": {
            "description": "A dictionary of profile information for a user, including name and phone number."
        }
    }
}

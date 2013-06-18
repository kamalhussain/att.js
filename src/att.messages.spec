{
    "plugin": "att.messages",
    "description": "",
    "methods": {
        "sendMessage": {
            "description": "",
            "parameters": [
                {"type": "string"},
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "getMessages": {
            "description": "",
            "parameters": [
            ],
            "callbackArgs": [
            ]
        },
        "getMessage": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "deleteMessage": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "searchByNumber": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        }
    },
    "events": {
        "messagesReady": {
            "description": "Raised when the messages object has been created with an access token."
        }
    },
    "datatypes": {
    }
}

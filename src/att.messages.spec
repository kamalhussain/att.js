{
    "plugin": "att.messages",
    "description": "",
    "methods": {
        "att.messages.sendMessage": {
            "description": "",
            "parameters": [
                {"type": "string"},
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "att.messages.getMessages": {
            "description": "",
            "parameters": [
            ],
            "callbackArgs": [
            ]
        },
        "att.messages.getMessage": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "att.messages.deleteMessage": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "att.messages.searchByNumber": {
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

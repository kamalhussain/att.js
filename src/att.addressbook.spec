{
    "plugin": "att.addressbook",
    "description": "",
    "methods": {
        "getContacts": {
            "description": "",
            "parameters": [
            ],
            "callbackArgs": [
            ]
        },
        "getContact": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "addContact": {
            "description": "",
            "parameters": [
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "updateContact": {
            "description": "",
            "parameters": [
                {"type": "string"},
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "deleteContact": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "getGroups": {
            "description": "",
            "parameters": [
            ],
            "callbackArgs": [
            ]
        },
        "getGroup": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "addGroup": {
            "description": "",
            "parameters": [
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "updateGroup": {
            "description": "",
            "parameters": [
                {"type": "string"},
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "deleteGroup": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        }
    },
    "events": {
        "addressBookReady": {
            "description": "Raised when the addressbook object has been created with an access token."
        }
    },
    "datatypes": {
    }
}

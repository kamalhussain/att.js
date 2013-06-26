{
    "plugin": "att.addressbook",
    "description": "",
    "methods": {
        "att.addressbook.getContacts": {
            "description": "",
            "parameters": [
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.getContact": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.addContact": {
            "description": "",
            "parameters": [
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.updateContact": {
            "description": "",
            "parameters": [
                {"type": "string"},
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.deleteContact": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.getGroups": {
            "description": "",
            "parameters": [
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.getGroup": {
            "description": "",
            "parameters": [
                {"type": "string"}
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.addGroup": {
            "description": "",
            "parameters": [
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.updateGroup": {
            "description": "",
            "parameters": [
                {"type": "string"},
                {"type": "object"}
            ],
            "callbackArgs": [
            ]
        },
        "att.addressbook.deleteGroup": {
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

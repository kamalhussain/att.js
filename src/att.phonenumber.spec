{
    "plugin": "att.phonenumber",
    "description": "A set of helper functions for parsing and processing phone number strings.",
    "methods": {
        "stringify": {
            "description": "Format a phone number to include dashes and parenthesis.",
            "parameters": [
                {"type": "string"}
            ],
            "returns": "string"
        },
        "parse": {
            "description": "Convert a phone number that uses letters into numeric format.",
            "parameters": [
                {"type": "string"}
            ],
            "returns": "string"
        },
        "getCallable": {
            "description": "Parses a phone number string into a callable format.",
            "parameters": [
                {"type": "string"},
                {"type": "string", "name": "countryCode", "optional": true, "default": "us"}
            ],
            "returns": "string"
        }
    },
    "events": {},
    "datatypes": {}
}

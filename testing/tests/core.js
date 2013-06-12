test("Basic init and event tests", function() {
    // how many assertions to expect
    expect(4);

    var att = new ATT();
    ok(att, "inits att object without errors");

    // ensure we get can trigger and listen
    // for abritrary events.
    att.on('arbitraryEvent', function (eventData) {
        equal(eventData, 'hello');
    });

    att.on('*', function (eventName, eventData) {
        equal(eventName, 'arbitraryEvent', 'includes event names as first argument');
        equal(eventData, 'hello', 'payload should be the string "hello"');
    });

    att.emit('arbitraryEvent', 'hello');
});

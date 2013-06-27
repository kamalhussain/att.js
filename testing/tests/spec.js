var att = new ATT({accessToken: 'TEST_TOKEN'});
var methodCount = 0;
att._.each(ATT.ATTSpec.spec, function (plugin) {
    methodCount += Object.keys(plugin.methods).length;
});


function runTest() {
    module('spec');
    test("Test that all spec methods exist", function () {
        expect(methodCount);
    
        att._.each(ATT.ATTSpec.spec, function (plugin) {
            att._.each(plugin.methods, function (method, methodName) {
                var fullName = methodName.replace(/^att\./, '');
                    sepPos = fullName.indexOf('.'),
                    namespace = fullName.substr(0, sepPos),
                    name = fullName.substr(sepPos + 1);
    
                if (sepPos < 0) {
                    name = fullName;
                    namespace = '';
                }

                console.log(fullName);
                console.log(name);
                console.log(att);
                if (namespace) {
                    equal(typeof (att[namespace] || {})[name], 'function', fullName);
                } else {
                    equal(typeof att[name], 'function', fullName);
                }
            });
        });
    });
}

// Ensure all plugins have loaded
setTimeout(runTest, 1000);

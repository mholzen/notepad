QUnit.file = "notepad-urilabel.js";

module("mock findEndpoint", {
    setup: function() {
        $.fn.findEndpoint = mockFunction("findEndpoint", $.fn.findEndpoint);
    },
    teardown: function() {
        // I could restore findEndpoint if necessary
    }
});

test("create", function() {

    $('<div about=":p">').urilabel();

    verify($.fn.findEndpoint)();
});


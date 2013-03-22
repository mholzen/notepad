QUnit.file = "notepad-urilabel.js";

module("mock findEndpoint", {
    setup: function() {
    	this.endpoint = new Triples();
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

asyncTest("create with uri", function() {

	this.endpoint = toTriples(toTriple(":p", "rdfs:label", "label"));

    var e = $('<div about=":p">').endpoint({endpoint: this.endpoint}).urilabel();
    var urilabel = e.data('notepadUrilabel');

    setTimeout(function() { 
        assertThat(e.text(), containsString('label'));

        assertThat(urilabel.triples(), [':p rdfs:label "label" .']);

        start()
    }, 1000);
    
});


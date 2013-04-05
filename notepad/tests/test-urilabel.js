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

module("test endpoint", {
    setup: function() {
        this.endpoint = $.notepad.test;
        $.fn.findEndpoint = mockFunction("findEndpoint", $.fn.findEndpoint);
        when($.fn.findEndpoint)().then(function(arg) {
            return $.notepad.dev;
        });
    },
    teardown: function() {
        // I could restore findEndpoint if necessary
    }
});
asyncTest("predicate-label-forward", function() {
    var template = '' +
'            <span class="tooltip"> ' +
'                <span class="item notepad-predicate" rel="rdfs:label">related to</span> ' +
'                <span class="content"> ' +
'                    <h1>Reverse of <span rel="notepad:inverseLabel">{{xsd:string}}</span></h1> ' +
'                    <h2>As in</h2> ' +
'                    <div about="{{{notepad:subject.uri}}} class="notepad-urilabel" />' +
'                    <ul about="{{{notepad:subject.uri}}}" class="notepad-container" /> ' +
'                </span> ' +
'            </span> ' +
'';

    var setup = toTriples( 
        toTriple('ex:created notepad:inverseLabel "created by"'),
        toTriple('ex:companyX ex:created ex:productY'),
        toTriple('ex:companyX rdfs:label "Company X"'),
        toTriple('ex:productY rdfs:label "Product Y"')
    );

    this.endpoint.insertData(setup, function() {

        var element = $('<div about="ex:created">').urilabel({
            query: $.notepad.queries.describe_predicate,
            template: template,     // should: use DOM
            dynamicTemplate: false, // should: not be required (be implied) because of defined template
        });

        setTimeout(function() {
            assertThat(element.text(), containsString('Reverse of created by'));
            assertThat(element.text(), containsString('Product Y created by Company X'));
            start();
        }, 500);

    });
});
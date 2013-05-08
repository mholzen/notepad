QUnit.file = "notepad-urilabel.js";

test("new uri when clear", function() {
    var urilabel = $('<div>').urilabel().data('notepadUrilabel');

    urilabel.setLabel('some text');
    var previous = urilabel.getUri();

    urilabel.newUri();
    urilabel.setLabel('new text');

    assertThat(urilabel.getUri(), not(previous));
});

test("type URL", function() {
    var urilabel = $("<div>").urilabel().data('notepadUrilabel');

    // via the browser, keyboard, user
    urilabel.element.find('[contenteditable="true"]').text('http://ex.com');
    assertThat(urilabel.triples().literals(), hasItem('http://ex.com'));

    // via the API
    urilabel.setLabel('http://another.example');
    assertThat(urilabel.triples().literals(), hasItem('http://another.example'));
});

test("external link", function() {
    var urilabel = $("<div>").urilabel();

    // via the browser, keyboard, user
    urilabel.find('[contenteditable="true"]').text('http://ex.com');

    assertThat(urilabel.meta('triples'), hasItem(hasMember('object', containsString('URL'))));
});

asyncTest("create with uri", function() {

	var endpoint = toTriples(toTriple(":p", "rdfs:label", "label"));

    var e = $('<div about=":p">').endpoint({endpoint: endpoint}).urilabel();
    var urilabel = e.data('notepadUrilabel');

    setTimeout(function() { 
        assertThat(e.text(), containsString('label'));

        assertThat(urilabel.triples(), [':p rdfs:label "label" .']);

        start()
    }, 2000);
    
});


module("test endpoint", {
    setup: function() {
        this.endpoint = $.notepad.test;
        $.fn.findEndpoint = mockFunction("findEndpoint", $.fn.findEndpoint);
        when($.fn.findEndpoint)().then(function(arg) {
            return $.notepad.test;
        });
    },
    teardown: function() {
        // I could restore findEndpoint if necessary
    }
});
asyncTest("predicate-label-forward", function() {
    var template = 
            '{{#rdfs:label}}' +
                '<div class="notepad-literal notepad-predicate" rel="rdfs:label">{{xsd:string}}</div>' +
            '{{/rdfs:label}}' +
            '{{^rdfs:label}}' +
                '{{#inst:inverseLabel}}' +
                    'Reverse of {{xsd:string}}' +
                '{{/inst:inverseLabel}}' +
                '{{^inst:inverseLabel}}' +
                    '<div class="item notepad-literal" rel="rdfs:label">related to</div>' +
                '{{/inst:inverseLabel}}' +
            '{{/rdfs:label}}' +
'';

    var setup = toTriples( 
        toTriple('ex:created inst:inverseLabel "created by"')
    );

    this.endpoint.insertData(setup, function() {

        var element = $('<div about="ex:created">').urilabel({
            query: $.notepad.queries.describe_predicate,
            template: template,
            dynamicTemplate: false, // should: not be required (be implied) because of defined template
        });

        setTimeout(function() {
            assertThat(element.text(), containsString('Reverse of created by'));
            start();
        }, 1000);

    });
});


QUnit.file = "notepad-label.js";

module("given an empty element", {
    setup: function() {
        this.element = $('<div>');
        $("#qunit-fixture").append(this.element);
    },
});
test("when I create a new label", function() {
    this.element.label();

    var label = this.element.data('notepadLabel');
    assertThat(label.isLiteral(),   not(truth()),       "then label is not a literal");
    assertThat(label.isUri(),       not(truth()),       "then label is not a URI");
    assertThat(label.triple(),      nil(),              "there is no triple associated");
});

module("given a element with initial text", {
    setup: function() {
        this.element = $('<div>text</div>');
        $("#qunit-fixture").append(this.element);
    }
});
test("when I create a new label", function() {
    var label = this.element.label().data('notepadLabel');

    assertThat(label.isLiteral(),   truth(),            "then label is a literal");
    assertThat(label.isUri(),       not(truth()),       "then label is not a URI");
    assertThat(label.getLiteral(),  equalTo("text"),    "then initial label is equal to the initial object text");
    assertThat(label.triple(),      nil(),              "there is no triple associated");
});

module("given an element with a URI", {
    setup: function() {
        this.element = $('<div about=":s">');
        this.endpoint = wrapInEndpoint(this.element);
    }
});
test("when I create a new label", function() {
    var labelTriple = new Triple(":s", "rdfs:label", "S");
    when(this.endpoint).execute().then(function() {arguments[1](new Triples(labelTriple, labelTriple)); });

    var label = this.element.label().data('notepadLabel');    

    assertThat(label.isLiteral(),   not(truth()), "then label is not a literal");
    assertThat(label.isUri(),       truth(), "then label is a URI");

    verify(this.endpoint,times(2)).execute(containsString("#s"));
        // once for the template
        // once for the data
});

module("given an element with a URI, with initial text", {
    setup: function() {
        this.element = $('<div about=":s">text</div>');
        this.endpoint = wrapInEndpoint(this.element);
    }
});
test("when I create a new label", function() {
    var label = this.element.label().data('notepadLabel');

    assertThat(label.isLiteral(),   not(truth()),       "the label should not be a literal");
    assertThat(label.isUri(),       truth(),            "the label should be a URI");

    verify(this.endpoint, never()).execute();           // The endpoint should NOT queried for a label

    assertThat(label.triples(), hasItem(':s rdfs:label "text" .'));
});

module("given an element within another element with a URI", {
    setup: function() {
        this.dom = $('<div about=":s"><div id="label">');
        this.endpoint = wrapInEndpoint(this.dom);
    },
    teardown: function() {
        $("#qunit-fixture").empty();
    }
});
test("when I create a new label", function() {
    var label = $("#label").label().data('notepadLabel');
    label.option('uriElement', this.dom);
    // label.option('uri', $("[about]").uri())

    // label.option('uriSelector', "[about]");
    // label.option('getUri', function(e) { return e.closest("[about]") } );
    // label.option('setUri', function(e,uri) { e.attr('about', uri); } );

    // label.option('uriSelector', "[rel],[rev]");
    // label.option('getUri', function(e) { return e.closest("[rel],[rev])") };
    // label.option('setUri', function(e,uri) { 
    //     var attr = e.attr('rel') ? 'rel' : 'rev';
    //     e.attr(attr, uri);
    // });

    assertThat(label.isLiteral(),      not(truth()),    "then label is not a literal");
    assertThat(label.isUri(),          truth(),         "then label is a URI");
    assertThat(label.triples().length, equalTo(0),      "it has no triples");

    verify(this.endpoint,times(1)).execute();       // The endpoint should be queried for a label
});

module("given a new label", {
    setup: function() {
        this.element = $('<div>');
        $("#qunit-fixture").append(this.element);
        this.label = this.element.label({autocomplete: true}).data('notepadLabel');
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.element.endpoint({endpoint: this.endpoint});
    }
});
asyncTest("when I type new text and select the choice", function() {
    var test = this;
    when(this.endpoint).getSubjectsLabelsByLabel().then( function() {
        arguments[1]( [ {value: ":aUri", label: "a label"} ] );
    });

    this.label.getLabelElement().text('lab').keydown();     // Can't seem to trigger events with a keyCode.  This is how autocomplete() tests keyboard events

    setTimeout(function() {
        //test.label.getLabelElement().simulate( "keydown", { keyCode: $.ui.keyCode.DOWN } );
        test.label.getLabelElement().trigger( "keydown", { keyCode: $.ui.keyCode.DOWN } );
        //test.label.getLabelElement().simulate( "keydown", { keyCode: $.ui.keyCode.ENTER } );
        test.label.getLabelElement().trigger( "keydown", { keyCode: $.ui.keyCode.ENTER } );

    }, 300);

    setTimeout(function() {
        
        verify(test.endpoint, times(1)).getSubjectsLabelsByLabel();          // should trigger autocomplete

        assertThat(test.label.isLiteral(),  not(truth()),        "the label should not be a literal");
        assertThat(test.label.getLiteral(), equalTo("a label"),  "its literal should have been set to what was selected");
        assertThat(test.label.getUri(),     equalTo(":aUri"),    "its uri should have been set to what was selected");
        start();

    }, 400);
    
});
test("when I (need a URI) set the URI", function() {
    this.label.setLiteral("a label");
    this.label.ensureUri();
    assertThat(this.label.isLiteral(),   not(truth()),  "then label is not a literal");
    assertThat(this.label.getLiteral(),  "a label");
    assertThat(this.label.isUri(),       truth(),       "then label is not a URI");
    this.label.element.append("<div>an element that should not affect the label</div>");
});

module("given a new label with a URI", {
    setup: function() {
        this.element = $('<div>');
        $("#qunit-fixture").append(this.element);
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.element.endpoint({endpoint: this.endpoint});
        this.uri = ":s";
        this.element.attr("about", this.uri);
        this.label = this.element.label().data('notepadLabel');
    },
    teardown: function() {
        this.label.destroy();
    }
});
asyncTest("when I display a URI that has no label", function() {
    var triples = new Triples();
    triples.add(new Triple(":s", "notepad:template", "{{#nmo:messageSubject}}{{xsd:string}}{{/nmo:messageSubject}}"));
    triples.add(new Triple(":s", "nmo:messageSubject", "a subject"));

    var test = this;
    var endpoint = TempFusekiEndpoint('http://localhost:3030/test', triples, function() {
        test.element.data('notepadEndpoint').option('endpoint', this);
        test.label.load( function() {
            assertThat(test.element.text(), containsString("a subject"), "it should display the subject");
            start();
        });
    });
});


module("given a element within a subject and predicate", {
    setup: function() {
        this.initialText = "initial label";
        this.element = $('<div>'+this.initialText+'</div>');
        this.predicate = $('<div rel=":p"></div>').append(this.element).predicate();
        this.subject = $('<div about=":s"></div>').append(this.predicate);
    }
});
test("when I create a new label", function() {
    this.element.label();
    var label = this.element.data('notepadLabel');
    assertThat(label.getSubjectUri(),   truth(), "it has a subject");
    assertThat(label.getPredicateUri(), truth(), "it has a predicate");
});

module("given an element within a subject and predicate", {
    setup: function() {
        this.subjectElement = $('<div about=":s">');
        this.predicateElement = $('<div rel=":p">').appendTo(this.subjectElement).predicate();
    }
});
test("when I create a new label to describe the predicate", function() {
    var element = $('<div>').appendTo(this.predicateElement);
    var label = element.label({uriElement: this.predicateElement, uriAttr: "rel"}).data('notepadLabel');
    assertThat(label.getResource(), ":p",  "it has no object");
    assertThat(label.triple(), nil(), "it has no triples");
});


module("given a label for a predicate", {
    setup: function() {
        this.dom = $('<div about=":s"><div rel=":p"><div id="label">');
        this.endpoint = wrapInEndpoint(this.dom);
        this.predicate = $("[rel=':p']").predicate().data('notepadPredicate');
        this.label = $("#label").label().data('notepadLabel');
    }
});
test("when I change the label", function() {
    this.label.element.text('another label');
    assertThat(this.label.getUri(), not(":p"));
});

asyncTest("dynamic template with user", function() {
    var sender = '<urn:uuid:5bd6e465-d7fd-4cea-ad91-0b99e097fdf1>'
    var dom = $('<div about="' + sender + '">').label({dynamicTemplate:true});
    var endpoint = wrapInEndpoint(dom, $.notepad.test);
    var widget = dom.data('notepadLabel');
    widget.uriChanged( function() {
        console.log(widget.element);
        assertThat(true);
        start();
    });
});

asyncTest("dynamic template with email", function() {
    var email = 'http://localhost:3030/test/864b139e-5c5d-11e2-bea1-c82a1402d8a8';
    var dom = $('<div about="' + email + '">').label({dynamicTemplate:true});
    var endpoint = wrapInEndpoint(dom, $.notepad.test);
    var widget = dom.data('notepadLabel');
    widget.uriChanged( function() {
        console.log(widget.element.html());
        assertThat(true);
        start();
    });
});

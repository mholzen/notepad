QUnit.file = "notepad-label.js";

function givenAnElement(world) {
    world.element = $('<div>');
    $("#qunit-fixture").append(world.element);
}
module("given an empty element", {
    setup: function() {
        givenAnElement(this);
    }
});
test("when I create a new label", function() {
    this.element.label();

    var label = this.element.data('label');
    assertThat(label.isLiteral(),   not(truth()),       "then label is not a literal");
    assertThat(label.isUri(),       not(truth()),       "then label is not a URI");
    assertThat(label.triple(),      nil(), "there is no triple associated");
});

function givenAnElementWithText(world) {
    givenAnElement(world);
    world.text = "initial label";
    world.element.text(world.text);
}
module("given a element with initial text", {
    setup: function() {
        givenAnElementWithText(this);
    }
});
test("when I create a new label", function() {
    var label = this.element.label().data('label');

    assertThat(label.isLiteral(),   truth(),            "then label is a literal");
    assertThat(label.isUri(),       not(truth()),       "then label is not a URI");
    assertThat(label.getLiteral(),  equalTo(this.text), "then initial label is equal to the initial object text");
    assertThat(label.triple(),      nil(), "there is no triple associated");
});

function givenAnElementWithUri(world) {
    givenAnElement(world);
    world.endpoint = mock(new FusekiEndpoint("http://ex.com"));
    world.element.endpoint({endpoint: world.endpoint});
    world.uri = ":s";
    world.element.attr("about", world.uri);
}
module("given a element with a URI", {
    setup: function() {
        givenAnElementWithUri(this);
    }
});
test("when I create a new label", function() {
    var labelTriple = new Triple(":s", "rdfs:label", "S");
    when(this.endpoint).execute().then(function() {arguments[1](new Triples(labelTriple, labelTriple)); });

    var label = this.element.label().data('label');    

    assertThat(label.isLiteral(),   not(truth()), "then label is not a literal");
    assertThat(label.isUri(),       truth(), "then label is a URI");

    verify(this.endpoint,times(1)).execute();       // The endpoint should be queried for a label
    //assertThat(label.triple().toString(), equalTo(labelTriple.toString()), "its triple should be the triple returned by the endpoint");
});

function givenAnElementWithUriWIthText(world) {
    givenAnElementWithUri(world);
    world.text = "initial label";
    world.element.text(world.text);    
}
module("given an element with a URI, with initial text", {
    setup: function() {
        givenAnElementWithUriWIthText(this);
    }
});
test("when I create a new label", function() {

    var label = this.element.label().data('label');

    assertThat(label.isLiteral(),   not(truth()),       "the label should not be a literal");
    assertThat(label.isUri(),       truth(),            "the label should be a URI");

    verify(this.endpoint, never()).execute();           // The endpoint should NOT queried for a label

    assertThat(label)
    assertThat(label.labelTriple(), equalToObject(new Triple(this.uri, "rdfs:label", this.text)), "there is a triple if a label was returned");
});

module("given an element within another element with a URI", {
    setup: function() {
        this.parentElement = $('<div>');
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.parentElement.endpoint({endpoint: this.endpoint});

        this.uri = ":s";
        this.parentElement.attr("about", this.uri);

        this.element = $('<div>');
        this.element.appendTo(this.parentElement);
    }
});
test("when I create a new label", function() {
    var label = this.element.label().data('label');    
    label.option('uriElement', this.parentElement);

    assertThat(label.isLiteral(),   not(truth()),   "then label is not a literal");
    assertThat(label.isUri(),       truth(),        "then label is a URI");

    verify(this.endpoint,times(1)).execute();       // The endpoint should be queried for a label
});

function givenANewLabel(world) {
    givenAnElement(world);
    world.label = world.element.label().data('label');
    world.endpoint = mock(new FusekiEndpoint("http://ex.com"));
    world.element.endpoint({endpoint: world.endpoint});
}
module("given a new label", {
    setup: function() {
        givenANewLabel(this);
    }
});

asyncTest("when I type new text and select the choice", function() {
    var test = this;
    when(this.endpoint).getSubjectsLabelsByLabel().then( function() {
        arguments[1]( [ {value: ":aUri", label: "a label"} ] );
    });

    this.element.text('lab').keydown();     // Can't seem to trigger events with a keyCode.  This is how autocomplete() tests keyboard events

    setTimeout(function() {
        test.element.simulate( "keydown", { keyCode: $.ui.keyCode.DOWN } );
        test.element.simulate( "keydown", { keyCode: $.ui.keyCode.ENTER } );
    }, 300);

    setTimeout(function() {
        verify(test.endpoint, times(1)).getSubjectsLabelsByLabel();          // should trigger autocomplete

        assertThat(test.label.isLiteral(),  not(truth()),        "the label should not be a literal");
        assertThat(test.label.getLiteral(), equalTo("a label"),  "its literal should have been set to what was selected");
        assertThat(test.label.getUri(),     equalTo(":aUri"),    "its uri should have been set to what was selected");
        start();

    }, 400);
    
});

function givenANewLabelWithUri(world) {
    givenAnElementWithUri(world);
    world.label = world.element.label().data('label');
}
module("given a new label with a URI", {
    setup: function() {
        givenANewLabelWithUri(this);
    },
    teardown: function() {
        this.label.destroy();
    }
});

module("given a element within a subject and predicate", {
    setup: function() {
        this.initialText = "initial label";
        this.element = $('<div>'+this.initialText+'</div>');
        this.predicate = $('<div rel=":p"></div>').append(this.element);
        this.subject = $('<div about=":s"></div>').append(this.predicate);
    }
});
test("when I create a new label", function() {
    this.element.label();
    var label = this.element.data('label');
    assertThat(label.getSubjectUri(),   truth(), "it has a subject");
    assertThat(label.getPredicateUri(), truth(), "it has a predicate");
});



// test("when I type new text", function() {
//     this.element.focus();

//     this.element.text('ABC');
//     // this.element.trigger(jQuery.Event("keydown", { which: 65 }) );
//     // this.element.trigger(jQuery.Event("keydown", { which: 66 }) );
//     // this.element.trigger(jQuery.Event("keydown", { which: 67 }) );

//     assertThat(this.object.isLiteral(), truth(), "the object should be a literal");
//     assertThat(this.object.getObjectLiteral(), equalTo("ABC"), "its literal should have been set to what was typed");
// });
// test("when I set its URI", function() {
//     this.object.setObjectUri(":s");
//     verify(this.endpoint, times(1)).execute();
//     assertThat(this.object.isUri(), truth(), "the object is now a URI");
// });
// test("when I set text", function() {
//     this.object.setObjectLiteral("a label");
//     ok(this.object.isLiteral(), "it should be a literal");
//         equal(this.object.getObjectLiteral(), "a label", "it's literal value should be what was set");
// });
// test("when I set text that is a URI", function() {
//     this.element.text('http://example.com');

//     this.object.setObjectUri('http://example.com');
//     assertThat(this.object.isUri(), truth(), "it is a URI");
//     assertThat(this.object.getObjectUri(), equalTo('http://example.com'), "it's URI is equal to the text that was typed");
//     verify(this.endpoint,times(1)).execute();
// });
// test("when I set a URI", function() {
//     this.object.setObjectUri(":uri");
//     ok(this.object.isUri(), "it should be a URI");
//     equal(this.object.getObjectUri(), ":uri", "it's literal value should be what was set");
//     verify(this.endpoint,times(1)).execute();
// });
// test("when I provide text, it should provide a URI or a literal", function(){
//     this.element.text("a human readable label");
//     this.element.change();

//     ok(this.object.getObjectUri() || this.object.getObjectLiteral(), "a URI or a literal is provided");
// });
// test("when I provide text with special characters, it should provide a URI or a literal", function(){
//     this.element.text('a human readable label with special characters (: and ")');
//     this.element.change();

//     ok(this.object.getObjectUri() || this.object.getObjectLiteral(), "a URI or a literal is provided");
// });
// test("when I customize the template with multiple predicates, then it display those predicate literals", function(){
//     when(this.endpoint).execute(anything()).then( function(sparql, callback) {
//         callback (
//             new Triples (
//             new Triple (":s", ":a", "A"),
//             new Triple (":s", ":b", "B")
//             )
//         );
//     });

//     var template = '<div><span>{{{:a}}}</span><span>{{{:b}}}</span></div>';
//     this.object.option('template', template);
//     assertThat(this.object.option('template'), equalTo(template));
//     assertThat(this.object.template(), equalTo(template));

//     this.object.setObjectUri(':s');

//     verify(this.endpoint,times(1)).execute();

//     assertThat(this.element.html(), equalTo('<div><span>A</span><span>B</span></div>'), "the object should have two spans");
//     //equal($(this.element[0]).find('span').length, 2, "the object should have two spans");
// });

// skippedTest("when I provide a triple with a label", function() {
//     this.object.setRdf([ new Triple(this.object.getObjectUri(), 'rdfs:label', 'new label') ]);
//     equal(this.element.find('.notepad-object').text(), 'new label', "the line's label should be updated");
// });
// skippedTest("when I provide a URI, it should retrieve the resource and display an element of it", function(){
//     this.element.text("http://www.google.com");
//     this.element.change();            
//     ok(false, "mock URL fetcher returns resource");
//     ok(this.object.response, "last response is defined");
//     ok(this.object.title, "title is defined");
// });

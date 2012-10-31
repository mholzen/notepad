QUnit.file = "notepad-predicate.js: "
module("given an empty element", {
    setup: function() {
        this.element = $("<div>");
    }
});
test("when I create a new predicate", function() {
    this.element.predicate();

    var predicate = this.element.data('predicate');
    assertThat(predicate, truth(), "the element has a predicate widget");
    assertThat(predicate.getUri(), nil(), "it has no predicate uri");
});

module("given a element within a subject", {
    setup: function() {
        this.initialText = "initial label";
        this.element = $('<div rel=":p">'+this.initialText+'</div>');

        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.subjectElement = $('<div about=":s">').endpoint({endpoint: this.endpoint});

        this.element.appendTo(this.subjectElement);
    }
});
test("when I create a new predicate", function() {
    this.element.predicate();
    var predicate = this.element.data('predicate');
    assertThat(predicate.getUri(), equalTo(':p'), "its predicate should be :p");
    verify(this.endpoint,times(1)).execute();       // We tried to fetch the label
    assertThat(predicate.getLabel(), truth(), "it has a label");
    assertThat(predicate.getSubject(), truth(), "it has a subject");
});

module("given a predicate within a subject", {
    setup: function() {
        this.initialText = "initial label";
        this.element = $('<div rel=":p">'+this.initialText+'</div>');

        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.subjectElement = $('<div about=":s">').endpoint({endpoint: this.endpoint});

        this.element.appendTo(this.subjectElement);
        this.predicate = this.element.predicate().data('predicate');
    }
});
test("when I add a triple", function() {
    var triple = new Triple(':s', ':p', "123");
    this.predicate.add(triple);
    assertThat(this.predicate.getObjects().length, equalTo(1), "it should have one object");
    assertThat(this.predicate.getObjects()[0].triple(), equalToObject(triple), "it should have one object that has a triple");
    assertThat(this.predicate.triples(), hasItem(equalToObject(triple)), "it contains the triple");
});

module("given a new object", {
    setup: function() {
        this.element = $("<p>").appendTo("#qunit-fixture").object();
        this.object = this.element.data('object');

        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element.endpoint({endpoint: this.endpoint});
    },
    teardown: function() {
        this.object.destroy();
    }
});
test("when I type new text", function() {
    this.element.focus();

    this.element.text('ABC');
    // this.element.trigger(jQuery.Event("keydown", { which: 65 }) );
    // this.element.trigger(jQuery.Event("keydown", { which: 66 }) );
    // this.element.trigger(jQuery.Event("keydown", { which: 67 }) );

    assertThat(this.object.isLiteral(), truth(), "the object should be a literal");
    assertThat(this.object.getObjectLiteral(), equalTo("ABC"), "its literal should have been set to what was typed");
});
test("when I set its URI", function() {
    this.object.setObjectUri(":s");
    verify(this.endpoint, times(1)).execute();
    assertThat(this.object.isUri(), truth(), "the object is now a URI");
});
test("when I set text", function() {
    this.object.setObjectLiteral("a label");
    ok(this.object.isLiteral(), "it should be a literal");
        equal(this.object.getObjectLiteral(), "a label", "it's literal value should be what was set");
});
test("when I set text that is a URI", function() {
    this.element.text('http://example.com');

    this.object.setObjectUri('http://example.com');
    assertThat(this.object.isUri(), truth(), "it is a URI");
    assertThat(this.object.getObjectUri(), equalTo('http://example.com'), "it's URI is equal to the text that was typed");
    verify(this.endpoint,times(1)).execute();
});
test("when I set a URI", function() {
    this.object.setObjectUri(":uri");
    ok(this.object.isUri(), "it should be a URI");
    equal(this.object.getObjectUri(), ":uri", "it's literal value should be what was set");
    verify(this.endpoint,times(1)).execute();
});
test("when I provide text, it should provide a URI or a literal", function(){
    this.element.text("a human readable label");
    this.element.change();

    ok(this.object.getObjectUri() || this.object.getObjectLiteral(), "a URI or a literal is provided");
});
test("when I provide text with special characters, it should provide a URI or a literal", function(){
    this.element.text('a human readable label with special characters (: and ")');
    this.element.change();

    ok(this.object.getObjectUri() || this.object.getObjectLiteral(), "a URI or a literal is provided");
});
test("when I customize the template with multiple predicates, then it display those predicate literals", function(){
    when(this.endpoint).execute(anything()).then( function(sparql, callback) {
        callback (
            new Triples (
            new Triple (":s", ":a", "A"),
            new Triple (":s", ":b", "B")
            )
        );
    });

    var template = '<div><span>{{{:a}}}</span><span>{{{:b}}}</span></div>';
    this.object.option('template', template);
    assertThat(this.object.option('template'), equalTo(template));
    assertThat(this.object.template(), equalTo(template));

    this.object.setObjectUri(':s');

    verify(this.endpoint,times(1)).execute();

    assertThat(this.element.html(), equalTo('<div><span>A</span><span>B</span></div>'), "the object should have two spans");
    //equal($(this.element[0]).find('span').length, 2, "the object should have two spans");
});

skippedTest("when I provide a triple with a label", function() {
    this.object.setRdf([ new Triple(this.object.getObjectUri(), 'rdfs:label', 'new label') ]);
    equal(this.element.find('.notepad-object').text(), 'new label', "the line's label should be updated");
});
skippedTest("when I provide a URI, it should retrieve the resource and display an element of it", function(){
    this.element.text("http://www.google.com");
    this.element.change();            
    ok(false, "mock URL fetcher returns resource");
    ok(this.object.response, "last response is defined");
    ok(this.object.title, "title is defined");
});

QUnit.file="test-object.js";
module("given an empty element", {
    setup: function() {
        this.element = $("<div>");
    }
});
test("when I create a new object", function() {
    this.element.object();

    var object = this.element.data('object');
    assertThat(object.isLiteral(), not(truth()), "then object is not a literal");
    assertThat(object.isUri(), not(truth()), "then object is not a URI");
});


module("given a element with text", {
    setup: function() {
        this.initialText = "initial label";
        this.element = $("<div>"+this.initialText+"</div>");
    }
});
test("when I create a new object", function() {
    this.element.object();
    var object = this.element.data('object');
    assertThat(object.isLiteral(), truth(), "then object is a literal");
    assertThat(object.isUri(), not(truth()), "then object is not a URI");
    assertThat(object.getObjectLiteral(), equalTo(this.initialText), "then initial label is equal to the initial object text");
    assertThat(object.getPredicate(), nil(), "it has no predicate uri");
});


module("given a element with an attribute 'about' its path", {
    setup: function() {
        this.element = $("<div>label</div>");
        this.subject = $('<div about=":s"/>').append(this.element);
    }
});
test("when I create a new object", function() {
    this.element.object();
    var object = this.element.data('object');
    assertThat(object.getPredicate(), nil(), "it has no predicate uri");
});

module("given a element with an attribute 'rel' in its path", {
    setup: function() {
        this.element = $("<div>label</div>");
        this.parent = $('<div about=":s" rel=":p"/>').append(this.element).predicate();
    }
});
test("when I create a new object", function() {
    this.element.object();
    var object = this.element.data('object');
    assertThat(object.getSubjectUri(), ':s', "it finds the subject uri");
    assertThat(object.getPredicateUri(), ':p', "it finds the predicate uri");
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
test("when I configure its predicate to a specific element", function() {
    var predicate = $('<div rel=":p">').predicate().data('predicate');
    this.object.option('predicate', predicate);
    assertThat(this.object.getPredicateUri(), equalTo(':p'), "it should find its predicate URI");
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

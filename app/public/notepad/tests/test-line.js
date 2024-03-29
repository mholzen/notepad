module("given a new line", {
    setup: function() {
        // this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.endpoint = new Triples();
    	this.dom = $('<div id="container" about=":s"><div id="line"/></div>').appendTo("#fixture");
    	this.container = this.dom.container().data('notepadContainer');
        this.line = this.dom.find('#line').line().data('notepadLine');
    },
    teardown: function() {
        this.line.destroy();
    }
});
test("line.toUri", function() {
    this.line.setLineLiteral("a literal");

    this.line.toUri();

    assertThat(this.line.getObject().element.text(), containsString('a literal'));
});

test("appendChildLine", function() {
    this.line.setLineLiteral("a literal");
    assertThat(this.line.getUri(), not(truth()));

    this.line.appendChildLine();

    assertThat(this.line.getUri(), truth());
    assertThat(this.line.getObject().element.text(), containsString('a literal'));
});

test("when I access the child container", function() {
    // Current: predicate.getSubjectUri(). uses: closest() to find subjectUri. implies: predicate should be inside object
    // (a) move childContainer inside label
    //  label could own displaying child lines.  Which makes sense.
    // (b) change predicate.getSubjectUri() to use subjectElement.  set subjectElement.
    //      when moving a line (indent, unindent), the predicate's subjectElement stays pointing to the original object
    //      i'm going to be moving lines around

    this.line.getObject().setUri(":abc");

    var childContainer = this.line.getChildContainer();
    var childLine = childContainer.appendLine();

    var line2 = childLine.insertLineAfter();

    var line3 = childContainer.appendLine();
    line3.indent();

    var triple = new Triple(":abc", ":p", "123");
    childContainer.update(toTriples(triple));
    assertThat(childContainer.triples(), hasItem(equalToObject(triple)));
});

test("new relationship", function() {
    var prevUri = this.line.getContainerPredicateUri();

    this.line.newPredicateUri("a new label");

    assertThat( this.line.element.find(":visible").text(), containsString('a new label'));
    assertThat( this.line.getContainerPredicateUri(), not(prevUri));
    assertThat( this.line.getPredicateLabel().getUri(), this.line.getContainerPredicateUri());

    this.line.newPredicateUri();

    assertThat( this.line.element.find(":visible").text(), containsString('related to'));

});

test("select a label", function() {

    var autocomplete = this.line.getPredicateLabel().element.find(":notepad-autocomplete2").data('notepadAutocomplete2');
    var ui = { item: { value: toTriples('ex:created rdfs:label "created"') } };

    var target = this.line.getPredicateLabel().element;

    autocomplete._trigger('select', { target: target }, ui);

    assertThat( this.line.getContainerPredicateUri().toString(), 'ex:created');
    assertThat( this.line.element.text(), containsString('created') );
    assertThat( this.line.getDirection(), 'forward');
});

test("select a reverse label", function() {

    var autocomplete = this.line.getPredicateLabel().element.find(":notepad-autocomplete2").data('notepadAutocomplete2');
    var ui = { item: { value: toTriples('ex:created inst:inverseLabel "created by"') } };

    var target = this.line.getPredicateLabel().element;
    autocomplete._trigger('select', { target: target }, ui);

    assertThat( this.line.getContainerPredicateUri(), 'ex:created');
    assertThat( this.line.element.text(), containsString('created by') );
    assertThat( this.line.getDirection(), 'backward');
});

module("", {});
testWithContainer("discoverPredicate",
    toTriples(
        ':p1 a rdf:Property',
        ':p1 rdfs:label "predicate" '
    ), function() {
    
    var el = $("<li>").appendTo(this.container.element).line();
    var line = el.data('notepadLine');

    line.getObject().uri().setLabel("predicate: literal");

    line.discoverPredicate();
    setTimeout(function() {
        assertThat(line.getPredicate().getUri(), ":p1");
        assertThat(line.getPredicateLabel().getLabel(), "predicate");
        assertThat(line.getObject().uri().getLabel(), "literal");
        start();
    }, 500);
});

test("discoverSparql", function() {
    var el = $("<li>").line();
    var line = el.data('notepadLine');
    line.setLineLiteral( toLiteral('construct {?s ?p ?o} from {?s ?p ?o}', 'sd:SPARQL11Update') );
    assertThat(line.discoverSparql(), instanceOf(Query));
});

function getContainer(uri) {
    var element = $('<div>').attr('about',uri).container();
    return element.data('notepadContainer');
}

testWithContainer("display reverse label", toTriples(':p rdfs:label "label"'), function() {
    this.container.element.attr('about', ':s');
    var line = this.container.appendLine();
    var elem = line.element;

    line.update(toTriple(':o', ':p', ':s'));

    setTimeout(function() {
        assertThat(elem.html(), containsString('<img'));
        start();
    }, 500);
});

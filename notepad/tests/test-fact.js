QUnit.file = "notepad-fact.js: ";
module("given an empty element", {
    setup: function() {
        this.element = $("<div>");
        this.element.appendTo("#qunit-fixture");
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.element.endpoint({endpoint: this.endpoint});
    }
});
test("create", function() {
    this.element.fact();
    var fact = this.element.data('notepadFact');
    assertThat(fact, truth(), "it has a fact widget");
    assertThat(fact.triples().length, equalTo(0), "it has no triples");
});

test("add", function() {
    this.element.fact();

    var fact = this.element.data('notepadFact');
    var triple = new Triple(':s', ':p', ':o');
    fact.setUri(':s')
    fact.add(triple);

    assertThat(fact.getUri(), equalTo(':s'));
    assertThat(fact.getSubjectLabel(), truth());

    assertThat(fact.getPredicates(':p').length, equalTo(1));
});

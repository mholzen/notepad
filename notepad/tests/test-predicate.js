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
        this.element = $('<div rel=":p">initial label</div>');
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.subjectElement = $('<div about=":s">').endpoint({endpoint: this.endpoint});
        this.element.appendTo(this.subjectElement);
    }
});
test("when I create a new predicate", function() {
    var predicate = this.element.predicate().data('predicate');
    assertThat(predicate.getUri(), equalTo(':p'), "its predicate should be :p");
    verify(this.endpoint,times(1)).execute();       // We tried to fetch the label
    assertThat(predicate.getLabel(), truth(), "it has a label");
    assertThat(predicate.getSubjectUri(), truth(), "it has a subject");
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
test("when I add a triple with a literal", function() {
    var triple = new Triple(':s', ':p', "123");
    this.predicate.add(triple);
    assertThat(this.predicate.triples(), hasItem(equalToObject(triple)), "it contains the triple");
    assertThat(this.predicate.getObjects().length, greaterThan(0), "it should have one object");
    assertThat(this.predicate.isForward(), truth(), "defaults to forward");
    this.predicate.toggleDirection();
    assertThat(this.predicate.isForward(), not(truth()), "flipped after toggle");
    assertThat(this.predicate.triples(), not(hasItem(equalToObject(triple))), "it doesn't contains the anymore");

    //assertThat(this.predicate.getObjects()[0].triple(), equalToObject(triple), "it should have one object that has a triple");
    //assertThat(this.predicate.triples().length, equalTo(1));
    //assertThat(this.predicate.triples().length, equalTo(0), "inverting the predicate should not return a triple");
});
test("when I add a triple with a URI", function() {
    var triple = new Triple(':s', ':p', ":o");
    this.predicate.add(triple);
    assertThat(this.predicate.triples(), hasItem(equalToObject(triple)), "it contains the triple");
    assertThat(this.predicate.getObjects().length, greaterThan(0), "it should have one object");
    assertThat(this.predicate.isForward(), truth(), "defaults to forward");
    this.predicate.toggleDirection();
    assertThat(this.predicate.isForward(), not(truth()), "flipped after toggle");
    assertThat(this.predicate.triples(), not(hasItem(equalToObject(triple))), "it doesn't contains the anymore");
    assertThat(this.predicate.triples(), not(hasItem(equalToObject(new Triple(":o", ":p", ":s")))), "it doesn't contains the anymore");
});


test("when I add a triple with a blank object", function() {
    var triple = new Triple(':s', ':p', "_:foo");
    this.predicate.add(triple);
    assertThat(this.predicate.getObjects().length, equalTo(1), "it should have one object");
    assertThat(this.predicate.getObjects()[0].triple(), equalToObject(triple), "it should have one object that has a triple");
    assertThat(this.predicate.triples(), hasItem(equalToObject(triple)), "it contains the triple");
});

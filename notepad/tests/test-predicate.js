QUnit.file = "notepad-predicate.js: "

module("given a element within a subject", {
    setup: function() {
        this.element = $('<div/>');
        this.subjectElement = $('<div about=":s">');
        this.element.appendTo(this.subjectElement);
    }
});
test("when I create a new predicate with a forward initial triple", function() {
    this.element.predicate({initialTriple: new Triple(":s", ":p", ":o")});

    var predicate = this.element.data('notepadPredicate');
    assertThat(predicate.isForward(), truth(), "defaults to forward");
    assertThat(predicate.triples(), hasItem(equalToObject(new Triple(":s", ":p", ":o"))));
    assertThat(predicate.getObjects(new Resource(":o")), truth());
});
test("when I create a new predicate with a backward initial triple", function() {
    this.element.predicate({initialTriple: new Triple(":o", ":p", ":s")});

    var predicate = this.element.data('notepadPredicate');
    assertThat(predicate.isForward(), not(truth()));
    assertThat(predicate.triples(), hasItem(equalToObject(new Triple(":o", ":p", ":s"))));
    assertThat(predicate.getObjects(new Resource(":o")), truth());
});
test("when I create a new predicate with a literal triple", function() {
    this.element.predicate({initialTriple: new Triple(":s", ":p", "123")});

    var predicate = this.element.data('notepadPredicate');
    assertThat(predicate.isForward(), truth());
    assertThat(predicate.triples(), hasItem(equalToObject(new Triple(":s", ":p", "123"))));
});

module("given an element within a subject with an 'rel' attribute", {
    setup: function() {
        this.element = $('<div rel=":p">initial label</div>');
        this.subjectElement = $('<div about=":s">');
        this.element.appendTo(this.subjectElement);
    }
});
test("when I create a new predicate", function() {
    var predicate = this.element.predicate().data('notepadPredicate');
    assertThat(predicate.getUri(), ':p', "its predicate should be :p");
    //verify(this.endpoint,times(1)).execute();       // We tried to fetch the label
    assertThat(predicate.getLabel(), truth(), "it has a label");
    assertThat(predicate.getSubjectUri(), truth(), "it has a subject");
});

module("given a new predicate :p", {
    setup: function() {
        this.element = $('<div rel=":p"/>');
        this.predicate = this.element.predicate().data('notepadPredicate');
    }
});
test("when I set a URI", function() {
    this.predicate.setUri(":foo");
    assertThat(this.predicate.getUri(), equalTo(":foo"));
    this.predicate.toggleDirection();
    assertThat(this.predicate.getUri(), equalTo(":foo"));
});

module("given a predicate within a subject", {
    setup: function() {
        this.initialText = "initial label";
        this.element = $('<div rel=":p">'+this.initialText+'</div>');

        this.subjectElement = $('<div about=":s">');

        this.element.appendTo(this.subjectElement);
        this.predicate = this.element.predicate().data('notepadPredicate');
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
    assertThat(this.predicate.triples(), hasItem(equalToObject(new Triple(":o", ":p", ":s"))), "it doesn't contains the anymore");
});


test("when I add a triple with a blank object", function() {
    var triple = new Triple(':s', ':p', "_:foo");
    this.predicate.add(triple);
    assertThat(this.predicate.getObjects().length, equalTo(1), "it should have one object");
    assertThat(this.predicate.getObjects()[0].triple(), equalToObject(triple), "it should have one object that has a triple");
    assertThat(this.predicate.triples(), hasItem(equalToObject(triple)), "it contains the triple");
});

module("given a label for a predicate", {
    setup: function() {
        this.dom = $('<div about=":s"><div id="pred" rel=":p">');
        this.endpoint = wrapInEndpoint(this.dom);
        this.predicate = $("#pred").predicate().data('notepadPredicate');
    }
});
test("when I toggle the predicate", function() {
    assertThat(this.predicate.getLabel().getUri(), ':p');
    this.predicate.toggleDirection();
    assertThat(this.predicate.getLabel().getUri(), ':p');
});

module("", { } );
asyncTest("label", function() {
    var container = $('<div>').endpoint({endpoint: toTriples(toTriple(":p", "rdfs:label", "forward label"))});

    var element = $('<div about=":s" rel=":p">').appendTo(container);

    element.predicate();
    var predicate = element.data('notepadPredicate');
    predicate.getLabel();

    setTimeout(function() {

        var forwardLabel = predicate.getLabel().element.text();
        assertThat(forwardLabel, containsString("forward label"));

        predicate.setUriDirection(':p', 'backward');

        setTimeout(function() {
            var backwardLabel = predicate.getLabel().element.text();
            assertThat(backwardLabel, not('forward label'));
            start();
        }, 1000);

    }, 1000);

});
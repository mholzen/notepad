QUnit.file = "notepad-predicate.js: "

test("nested object locations", function() {
    var element, object;
    element = $('<div class="value"><div class="value"></div></div>');

    assertThat(element.findObjectLocations().length, 1);        // or 2?
});

test("triples", function() {
    var element, object;
    element = $('<div about=":marc" rel=":first"/>');
    assertThat(element.triples().length, 0);

    element.predicate();
    var predicate = element.data('notepadPredicate');
    predicate.add(toTriple(":marc", ":first", "Marc"));

    assertThat(element.triples().length, 1, "test: nested object locations");
    assertThat(element.triples().length, 1, "should be idempotent");

    predicate.update(toTriple(":marc", ":first", "Marco"));
    assertThat(element.triples().length, 1);

    predicate.add(toTriple(":marc", ":first", "Marc"));
    assertThat(element.triples().length, 2);

});

test("object", function() {
    var element, object;
    element = $('<div about=":marc" rel=":first">Marc</div>');
    element.object();
    object = element.data('notepadObject');
    assertThat(object.triple().object, "Marc");
    assertThat(element.triples(), [':marc :first "Marc" .']);
    // if an object is also a predicate, then it is a literal

    element.predicate();
    var predicate = element.data('notepadPredicate');
    predicate.insertObject();
    predicate.getObjects()[0].setObject('Marc');

    assertThat(element.findObjectLocations().length, 2);
    assertThat(element.triples(), 1);
    assertThat(element.triples().length, 1);
    console.log(element.findObjects());
});

test("display vs edit", function() {

    var element = $('<div about=":marc" rel=":first"/>');
    predicate = element.predicate().data('notepadPredicate');
    predicate.update(toTriple(":marc", ":first", "Marc"));

    element = $('<div about=":marc" rel=":first" contenteditable="true" class="notepad-autocomplete"/>');
    predicate = element.predicate().data('notepadPredicate');
    element.focus().text('Marc');
    assertThat(predicate.triples()
        [':marc :first :o1', ':o1 rdfs:label "Marc"']
        );
}); 

test("update", function() {

    var dom;

    // :s :p ("1", "2", "3", "<a>4</a>"^^xsd:XMLLiteral, :o5)  

    dom = $(
    '<div about=":s" rel=":p">1' +              // content="1" should take precedence over the text element
        '<div content="2"/>' +
        '<div class="value">3</div>' +
        '<div class="value"><a>4</a></div>' +
        '<div about=":o5"/>' +
    '</div>');

    assertThat(dom.findPredicates().length, 1);

    assertThat(dom.findPredicates(':s',':p').length, 1);

    var dom1 = $('<div about=":s"><h1><div rel=":p">1</div></div></h1>');
    assertThat(dom1.find('h1').findPredicates().length, 1, "finds a predicate");

    // object locations

    assertThat(dom.findObjectLocations().length, 5); // or 6


    // objects

    assertThat(dom.findObjects().length, 5);
    assertThat(dom.findObjects().length, 5);

    var predicate = dom.predicate().data('notepadPredicate');
    // assertThat(predicate.getObjects().length, 5);  after refactoring getObjects to use findObjects

    assertThat($.contains(dom[0], predicate.getLabel().element[0]), false, "the label should not be inside the predicate");

    predicate.update(toTriple(":s", ':p' ,':o1'));

    assertThat(predicate.triples().length, 1);
    assertThat(predicate.triples()[0].object, ':o1');

    // Revert to a literal
    predicate.update(toTriple(":s", ':p' ,'1'));
    assertThat(predicate.triples().length, 1);
    assertThat(predicate.triples()[0].object, '1');

    assertThat(dom.triples(), 5);
});
test("update object", function() {
    var dom;
    dom = $('<div about=":s" rel=":p"><a class="object" object-attr="href"></div>');
    update(dom, ":s :p :o");
    expect('<div about=":s" rel=":p"><a class="object" object-attr="href" href=":o"></a></div>');

    dom = $('<div about=":s" rel=":p" class="object" object-attr="href"></div>');
    update(dom, ":s :p :o");
    expect( '<div about=":s" rel=":p" class="object" object-attr="href" href=":o"></div>');

    dom = $('<div about=":s" rel=":p"><a class="object" object-attr="href" rel="rdfs:label"></div>');
    update(dom, ":s :p :o", ":o rdfs:label 'foo'");
    expect('<div about=":s" rel=":p"><a class="object" object-attr="href" href=":o">foo</a></div>');

    dom = $('<div about=":s" rel=":p" content="literal">');

});

module("given a element within a subject", {
    setup: function() {
        this.element = $('<div/>');
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.subjectElement = $('<div about=":s">').endpoint({endpoint: this.endpoint});
        this.element.appendTo(this.subjectElement);
    }
});

test("initial triple", function() {
    this.element.predicate({initialTriple: new Triple(":s", ":p", ":o")});

    var predicate = this.element.data('notepadPredicate');
    assertThat(predicate.isForward(), truth(), "defaults to forward");
    assertThat(predicate.triples(), hasItem(equalToObject(new Triple(":s", ":p", ":o"))));
    assertThat(predicate.getObjects(new Resource(":o")), truth());
});

test("getObjects", function() {
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
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.subjectElement = $('<div about=":s">').endpoint({endpoint: this.endpoint});
        this.element.appendTo(this.subjectElement);
    }
});
test("when I create a new predicate", function() {
    var predicate = this.element.predicate().data('notepadPredicate');
    assertThat(predicate.getUri(), ':p', "its predicate should be :p");
    verify(this.endpoint,times(1)).execute();       // We tried to fetch the label
    assertThat(predicate.getLabel(), truth(), "it has a label");
    assertThat(predicate.getSubjectUri(), truth(), "it has a subject");
});

module("given a new predicate :p", {
    setup: function() {
        this.element = $('<div rel=":p"/>');
        //this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
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

        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.subjectElement = $('<div about=":s">').endpoint({endpoint: this.endpoint});

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

asyncTest("predicate label", function() {
    var element = $('<div about=":s" rel=":p">').endpoint({endpoint: toTriples(toTriple(":p", "rdfs:label", "forward label"))});

    element.predicate();

    var predicate = element.data('notepadPredicate');

    setTimeout(function() {
        var forwardLabel = predicate.getLabel().element.text();
        assertThat(forwardLabel, containsString("forward label"));

        predicate.setDirection('backward');

        setTimeout(function() {
            var backwardLabel = predicate.getLabel().element.text();
            assertThat(backwardLabel, not('forward label'));
            start();
        }, 400);

    }, 400);

});
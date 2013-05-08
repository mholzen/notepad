QUnit.file="test-container2.js";
module("given a container2 with no uri", {
    setup: function() {
        this.element = $('<div>').container2();
        this.container = this.element.data('notepadContainer2');
    },
    teardown: function() {
        this.container.destroy();
    }
});

test("when a child element queries for triples, it interject its content before passing it on", function() {
    var childElement = $('<div>').appendTo(this.container.element);
    var foundEndpoint = childElement.findEndpoint();
    
    assertThat(foundEndpoint, equalTo(this.container.element.data('notepadEndpoint').getEndpoint()), "the endpoint found by a child element is the container");
    // WOW.  some more ugly ass shit
});

test("when add a triple ", function() {
    var triple = new Triple(':a', ':b', ':c');
    this.container.addTriple(triple);
    assertThat(this.container.triples().expresses(triple), truth(), "the container should express this triple");
    assertThat(this.container.triples().length, equalTo(1), "the container should have only 1 triple");
});

test("when add two triples with the same subject", function() {
    var triple = new Triple(':a', ':b', ':c');
    this.container.addTriple(triple);

    var triple2 = new Triple(':a', ':b1', ':c1');
    this.container.addTriple(triple2);

    assertThat(this.container.elements().length, equalTo(1), "it should have one element");
});

module("given a container2 with no uri", {
    setup: function() {
        this.element = $('<div>').container2();
        this.container = this.element.data('notepadContainer2');
    },
    teardown: function() {
        this.container.destroy();
    }
});

// containerChainEnpoint not figured out
skippedTest("when I add triple to a container2, then it retrieves the labels", function() {
    var triple = new Triple(':a', ':p', "123");
    this.container.addTriple(triple);
    assertThat(this.container.triples(), hasItem(equalToObject(triple)), "the container contains the triple");
    start();
});


// Skipped until...
skippedTest("when I add a triple to it", function() {
    var test = this;
    function addAndTest(triple) {    
        var line = test.container.addTriple(triple);
        assertThat(line.triple(), equalToObject(triple));
        assertThat(test.container.triples(), hasItem(equalToObject(triple)), "the container should contain it");

        // verify that the container tried to display 'triple.subject'
        verify(test.endpoint,times(1)).execute(containsString(triple.subject.toSparqlString()));
    }
    addAndTest(new Triple(":aUri", ":describe1", "a literal"));
    addAndTest(new Triple(":aUri", ":relate1", ":anotherUri"));
    addAndTest(new Triple(":anotherUri", ":foo", "another literal"));

    verify(test.endpoint,times(2)).getLabels(":describe1");
    verify(test.endpoint,times(2)).getLabels(":relate1");
    verify(test.endpoint,times(1)).getLabels(":foo");

    assertThat(this.container.getLines().length, greaterThanOrEqualTo(3), "it has at least 3 lines");
});

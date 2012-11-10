QUnit.file="test-container2.js";
module("given a container2 with no uri", {
    setup: function() {
        this.element = $('<div>').container2();
        this.container = this.element.data('container2');
    },
    teardown: function() {
        this.container.destroy();
    }
});

test("when a child element queries for triples, it interject its content before passing it on", function() {
    var childElement = $('<div>').appendTo(this.container.element);
    var foundEndpoint = childElement.findEndpoint();
    
    assertThat(foundEndpoint, equalTo(this.container.element.data('endpoint').getEndpoint()), "the endpoint found by a child element is the container");
    // WOW.  some more ugly ass shit
});

test("when add a triple ", function() {
    var triple = new Triple(':a', ':b', ':c');
    this.container.addTriple(triple);
    assertThat(this.container.triples().expresses(triple), truth(), "the container should express this triple");
});

test("when add two triples with the same subject", function() {
    var triple = new Triple(':a', ':b', ':c');
    this.container.addTriple(triple);

    var triple2 = new Triple(':a', ':b1', ':c1');
    this.container.addTriple(triple2);

    assertThat(this.container.elements().length, equalTo(1), "it should have one element");
});

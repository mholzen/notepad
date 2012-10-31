QUnit.file = "test-filter.js";
module("given a container with no uri", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element = $('<ul>').container().endpoint({endpoint: this.endpoint});
        this.container = this.element.data('container');
        this.line = this.element.find("li:first").data('line');
    },
    teardown: function() {
        this.container.destroy();
    }
});
test("when i create filters, then ", function() {
    this.container._createFilters();
    assertThat(this.element.children('.notepad-container').length, equalTo(1), "the container has one direct child that is a container");
    assertThat(this.container.filters(), truth(), "the filters are defined");
});
test("when I add a triple to it", function() {
    var test = this;
    function addAndTest(triple) {    
        var line = test.container.addTriple(triple);
        assertThat(line.triple(), equalToObject(triple));
        assertThat(test.container.triples(), hasItem(equalToObject(triple)), "the container should contain it");
    }
    addAndTest(new Triple(":aUri", ":describe", "a literal"));
    addAndTest(new Triple(":aUri", ":relate", ":anotherUri"));
    addAndTest(new Triple(":anotherUri", ":describe", "another literal"));

    assertThat(this.container.getLines().length, greaterThanOrEqualTo(3), "it has at least 3 lines");
});

module("given a container with an 'about' attribute", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element = $('<ul about=":s">').container().endpoint({endpoint: this.endpoint});
        this.container = this.element.data('container');
    }
});
test("when I add a triple to it", function() {
    var uri = this.container.element.attr('about');

    var newTriple = new Triple(':s', ":describe", "a literal");
    
    var line = this.container.addTriple(newTriple);
    assertThat(line.triple(), equalToObject(newTriple));
    assertThat(this.container.triples(), hasItem(equalToObject(newTriple)), "the container should contain it");
});
test("when I get its source element", function() {
    assertThat(this.container.getSourceElement()[0], equalTo(this.element[0]), "it is the container itself");
});
test("when I create and execute the default query", function() {
    var container = spy(this.container);
    var query = $.notepad.queryFromContainer(container);
    query(function(triples) {
        ok(true, "the callback function should be called");
    });

    verify(container, times(1)).triples();   // the query accessed the triples from the container
});
test("when I create another container inside of it", function() {
    expect(2);
    var container = spy(this.container);
    var query = spy($.notepad.queryFromContainer(container));
    var newContainerElement = $('<ul>').appendTo(this.element).container({query: query});
    var newContainer = spy(newContainerElement.data('container'));

    newContainer.load();

    verify(query)();       // that function was called
    verify(container, times(1)).triples();  //then the new container works on the triples of the parent container
});


module("given a container depending on another container", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.sourceContainerElement = $('<ul>').container().endpoint({endpoint: this.endpoint});
        this.sourceContainer = mock(this.sourceContainerElement.data('container'));
        this.dependantContainer = $('<ul>').container().endpoint({endpoint: this.endpoint}).data('container');
        this.dependantContainer.option('query', $.notepad.queryFromContainer(this.sourceContainer));
    }
});
test("when I load the dependant container", function() {
    // then the container reloads
    this.dependantContainer.load();
    verify(this.sourceContainer,times(1)).triples();        // then I access the sourceContainer's triples
});
test("when I change the source container", function() {
    // then the container reloads
    this.dependantContainer.load();
    verify(this.sourceContainer,times(1)).triples();        // then I access the sourceContainer's triples
});

module("given a container with a URI", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element = $('<ul about=":s">').container().endpoint({endpoint: this.endpoint});
        this.container = mock(this.element.data('container'));
        this.largeTriples = new Triples(0);
        for (var i=0; i < 15; i++) {
            this.largeTriples.push(new Triple(":s", ":p1", "this literal number "+i));
            this.largeTriples.push(new Triple(":s", ":p2", "same value"));
        }
    }
});

test("when I load a large result sets, then its containerFilter is displayed", function() {
    var test = this;
    when(this.endpoint).describe(":s", anything()).then(function() { callback =arguments[1]; callback(test.largeTriples); });

    assertThat(this.container.filters(), not(truth()), "there is no filter before loading the parent");
    this.container.load();

    assertThat(this.container.filters(), truth(), "there is a filter container after the load ");
    assertThat(this.container.filters().getLines().length, greaterThan(2), "one cluster for all unique predicates");
});

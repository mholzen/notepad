QUnit.file = "test-filter.js";
module("given queries", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint("http://localhost:3030/dev"));
        this.emails = "<http://localhost:3030/dev/699676b0-13f0-11e2-9b2e-c82a1402d8a8>";
        this.marc   = "<file://localhost/Users/holzen/git/notepad/notepad/tests/notepad.html#39f7a8ad-c245-c31d-9907-bb1266ce3417>"

    }
});
asyncTest("cluster", function() {

    var q0 = $.notepad.describeQuery;
    assertThat(q0.toSparql(), containsString("CONSTRUCT"));
    assertThat(q0.where(), not(containsString("CONSTRUCT")));

    var query = $.notepad.clusterQuery;

    console.debug(query.toSparql({about: this.emails}));

    $.notepad.clusterQuery.execute(this.endpoint, {about: this.emails}, function(triples) {
        console.debug(triples.toPrettyString());
        assertThat(triples.length, greaterThan(0), "it returns at least one result");
        start();
    });
});

asyncTest("query", function() {

    var parent = $('<ul>').container().endpoint({endpoint: this.endpoint}).prependTo($("#fixture"));
    var filter = $('<div class="notepad-filters">').prependTo(parent).container2();
    var container2 = filter.data('container2');
    var about = new Resource(this.emails);
    var clusters = $.notepad.clusterQuery.execute(this.endpoint, {about: about.toSparqlString()}, function(triples) {
        container2.addAllTriples(triples);
        assertThat(triples.length, greaterThan(0), "it should return some triples");
        start();
    });

});

skippedTest("filter", function() {
    var parent = $('<ul>').container().endpoint({endpoint: this.endpoint}).prependTo($("#fixture"));
    
    parent.setUri(this.emails);
    
    assertThat(parent.filters(), not(nil()), "the container should create filters");

    parent.filters().find("input:eq(0)").attr("checked", "checked");

    assertThat(parent.getQuery(), containsString("Can you endorse me"), "the query uses the filter");
});


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
    var query = $.notepad.clustersFromContainer(container);
    query(function(triples) {
        ok(true, "the callback function should be called");
    });

    verify(container, times(1)).triples();   // the query accessed the triples from the container
});
test("when I create another container inside of it", function() {
    expect(2);
    var container = spy(this.container);
    var query = spy($.notepad.clustersFromContainer(container));
    var newContainerElement = $('<ul>').appendTo(this.element).container({query: query});
    var newContainer = spy(newContainerElement.data('container'));

    newContainer.load();

    verify(query)();       // that function was called
    verify(container, times(1)).triples();  //then the new container works on the triples of the parent container
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
    when(this.endpoint).describe(":s", anything()).then(function() { callback = arguments[1]; callback(test.largeTriples); });

    assertThat(this.container.filters(), not(truth()), "there is no filter before loading the parent");
    this.container.load();

    assertThat(this.container.filters(), truth(), "there is a filter container after the load ");
});

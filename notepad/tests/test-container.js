QUnit.file = "test-container.js";
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
test("when I load the content, then ", function() {
    raises(function() { this.container.load() } , /cannot /, "it should require the URI");
});
test("when I set the URI and load, then", function() {
    this.element.attr('about', ':s');    
    assertThat(this.container.getSourceElement()[0], equalTo(this.element[0]), "the source element for the container is itself");

    this.container.load();

    verify(this.endpoint, times(1)).describe();
});

module("given a container with the uri :s", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element = $('<ul about=":s">').container().endpoint({endpoint: this.endpoint});
        this.container = this.element.data('container');
        this.line = this.element.find("li:first").data('line');
    },
    teardown: function() {
        this.container.destroy();
    }
});
test("when I do nothing", function() {
    equal(this.container.triples().length, 0, "then the new contianer should have 0 triples");
    equal(this.container.sortBy().length,0, "then the list of available sort orders should be empty");
    // Could the above be " this.container.sort.values.length " instead?
    // The list could be greyed out
});
test("when I append an empty line, ", function() {
    this.container.appendLine();
    equal(this.container.triples().length, 0, "then first new line should not count towards facts");
    this.container.appendLine();
    equal(this.container.triples().length, 0, "then second new line should not count towards facts");
});
test("when I add a triple where the container is the subject, then the container contains it", function() {
    var triple = new Triple(":s", ":p", ":o");
    var triplesPre = this.container.triples();
    var linesCountPre = this.container.getLines().length;

    this.container.add(triple);

    equal(this.container.getLines().length, linesCountPre+1, "the container should add 1 new lines");
    var line = this.container.getLines()[0];
    assertThat(line.getObject().isUri(), truth(), "the object should be a URI");
    assertThat(line.getObject().getResource(), equalTo(":o"), "the object should have a value of :o");
    ok(!triplesPre.contains(triple), "the initial triples do not contain it");
    assertThat(this.container.triples(), hasItem(equalToObject(triple)), "the triples contains it");
    ok(!this.container.reverseTriples().contains(triple), "the reverse triples does not contain it");
});
test("when I add a triple where the container is the subject, then the container displays the labels for the predicate and object", function() {
    var triple = new Triple(":s", ":p", ":o");
    when(this.endpoint).getLabels(":p", anything()).then(function() { callback=arguments[1]; callback(["P"]); });

    this.container.add(triple);

    var line = this.container.getLines()[0];
    ok(line.getContainerPredicateUri(), ":p", "then the line's predicate should be :p");
    ok(line.getContainerPredicateLabel(), "P", "then the line's predicate label should be ...");

    verify(this.endpoint,times(2)).getLabels();
});
test("when I add a triple where the container is the object, then the container contains it", function() {
    var triple = new Triple(":s1", ":p", ":s");

    this.container.add(triple);

    var line = this.container.getLines()[0];
    assertThat(line.getDirection(), equalTo(BACKWARD), "the line should be backwards");
    assertThat(line.subject(), equalTo(':s1'), "the line's subject should be the subject of the triple");
    assertThat(line.getObject().isLiteral(), not(truth()), "the object should not be a literal");
    assertThat(line.getObject().isUri(), truth(), "the object should not be a URI");
    assertThat(line.getObject().getResource(), equalTo(':s1'), "the object should be ther object of the triple");

    ok(this.container.triples().contains(triple), "the triples contains it");
    ok(this.container.reverseTriples().contains(triple), "the reverse triples contains it");
});
test("when I add a triple with a literal, then the container contains it", function() {
    var triple = new Triple(":s", ":p", 'a literal');

    this.container.add(triple);

    equal(this.container.getLines().length, 1, "the container has one new line");
    var line;
    ok(line = this.container.getLines()[0], "the container has a line for it");

    equal(line.getObject().element.text(), 'a literal', "the line's object displays the literal");

    assertThat(this.container.triples(), hasItem(equalToObject(triple)));

    ok(this.container.triples().contains(triple), "the triples contains it");



    ok(this.container.getLines().length, 1, "the container has only one line")
    var line;

    
    equal(line.triples().length, 1, "the line has only one triple (no child triples)");
    ok(line.triples().contains(triple), "the line has the triple");
    equal(line.getLineTriple(), undefined, "the line triple is undefined");
    deepEqual(line.getContainerTriple(), triple, "the container triple is the triple");
});
test("when I add a triple where the container is the predicate, then nothing happens", function() {
    var triple = new Triple(":s1", ":s", ":o");

    this.container.add(triple);

    ok(!this.container.triples().contains(triple), "the triples does not contains it");
    ok(!this.container.reverseTriples().contains(triple), "the reverse triples does not contains it");
});
test("when I add a triple where the container is the object and subject, then the container contains it", function() {
    var triple = new Triple(":s", ":p", ":s");

    this.container.add(triple);

    ok(this.container.triples().contains(triple), "the triples contains it");
    ok(this.container.reverseTriples().contains(triple), "the reverse triples does not contains it");
});
test("when I add an unrelated triple to a container, then the container should do nothing", function() {
    expect(1);
    var linesCountPre = this.container.getLines().length;
    this.container.add( new Triple(":aUri", ":p", ":o"));
    equal(this.container.getLines().length, linesCountPre, "the container should add no new lines");
});
test("when I change the default state of the element widget to collapsed", function() {
    var triple = new Triple(":s", "rdfs:member", ":o");
    var childTriple = new Triple(":o", "rdfs:member", ":o2");

    this.container.option("collapsed", true);

    this.container.add(triple);
    
    var line = this.container.getLines()[0];

    equal(line.getLines().length, 0, "then the new line's children are not fetched");

    ok(line.collapsed(), "the line is collapsed");
    line.childrenToggle(false);
    ok(!line.collapsed(), "the line is expanded");

    //verify(this.endpoint, atLeastOnce()).execute();
    //verify(this.endpoint, times(4)).execute();

    //equal(line.getLines().length, 1, "then the new line's children have been fetched");
});
asyncTest("when I configure a container to retrieve triples from another container", function() {
    expect(1);
    var sourceElement = $('<p about=":uri">');
    var endpoint = mock(new FusekiEndpoint('http://ex.com'));
    when(endpoint).describe().then( function() {
        var callback = arguments[1];
        callback(new Triples( new Triple(':uri', ":p", ":o"), new Triple(':uri', ":p1", ":o1")));
    });
    sourceElement.endpoint({endpoint: endpoint});

    var containerElement = $('<ul>').container({query: $.notepad.queryFromObject(sourceElement), sourceElement: sourceElement});
    var container = containerElement.data('container');

    containerElement.endpoint({endpoint: endpoint});        // This container needs an endpoint to retrieve labels
    
    container.load();

    setTimeout( function() {
        verify(endpoint, times(1)).describe(":uri");

        start();
    }, 200);
});
test("when I configure the container to display members in a different element", function() {
    this.container.option('template', '<ul>{{#rdfs:member}}<li class="notepad-line"> <ul class="notepad-container"/> </li> {{/rdfs:member}}</ul>');

    // how do I specify a subset of the graph to display:
        // by predicate is subpropertyof
        // by object is class
        // by literal
        // by subject is class

    // consider defining multiple containers dependant on the same query
    // <div notepad>
    //     <ul>
    //         <li><span rel="rdfs:member">member</span>
    //             <div class="notepad-container-with-clusters"/>
    //                 <ul class="clusters"/>
    //                 <ul class="elements"/>
    //             </div>

    //         </li>
    // </div>


    // consider the concept of self describing data sets (it's ok for a container to search for more results about how to display a dataset)
    this.container.refresh();
    ok(true);
});
test("when I configure two containers to be applied to the results of one query", function() {
    var query = "construct {?s ?p ?o} where {?s ?p ?o}";
    ok(true);
});


module("given a container2 with no uri", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element = $('<div>').container2().endpoint({endpoint: this.endpoint});
        this.container = this.element.data('container2');
    },
    teardown: function() {
        this.container.destroy();
    }
});
test("when I add triple to a container2, then it retrieves the labels", function() {
    var triple = new Triple(':a', ':p', "123");
    this.container.addTriple(triple);
    assertThat(this.container.triples(), hasItem(equalToObject(triple)), "the container contains the triple");
    verify(this.endpoint,times(2)).execute(containsString("#a"));       // TODO: should be times(1)
    verify(this.endpoint).execute(containsString("#p"));
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

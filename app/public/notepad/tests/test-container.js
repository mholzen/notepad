QUnit.file = "test-container.js";
module("given a container with no uri", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element = $('<ul>').container().endpoint({endpoint: this.endpoint});
        this.container = this.element.data('notepadContainer');
        this.line = this.element.find("li:first").data('notepadLine');
    },
    teardown: function() {
        this.container.destroy();
    }
});
test("when I set the URI and load, then", function() {
    this.element.attr('about', ':s');    
    assertThat(this.container.getSourceElement()[0], equalTo(this.element[0]), "the source element for the container is itself");

    this.container.load();

    verify(this.endpoint, times(1)).execute();
});

module("given a container with the uri :s", {
    setup: function() {
        // this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.element = $('<ul about=":s">').container(); //.endpoint({endpoint: this.endpoint});
        this.container = this.element.data('notepadContainer');
        this.line = this.element.find("li:first").data('notepadLine');
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
test("appendLine", function() {
    var element = $('<ul about=":s">').container();
    var container = element.data('notepadContainer');
    this.container.appendLine();
    assertThat(this.container.triples(), equalTo([]), "then first new line should not count towards facts");
});
test("add-uri", function() {
    var triple = new Triple(":s", ":p", ":o");
    var triplesPre = this.container.triples();
    var linesCountPre = this.container.getLines().length;

    this.container.add(triple);

    equal(this.container.getLines().length, linesCountPre+1, "the container should add 1 new lines");
    var line = this.container.getLines()[0];
    assertThat(line.getObject().isUri(), truth(), "the object should be a URI");
    assertThat(line.getObject().getObject(), equalTo(":o"), "the object should have a value of :o");
    assertThat(line.getPredicate().getLabel(), not(nil), "then the line's predicate label should be ...");
    assertThat(line.getPredicate().getUri(), ":p", "then the line's predicate should be :p");
    ok(!triplesPre.contains(triple), "the initial triples do not contain it");

    assertThat(this.container.triples(), not(hasItem(equalToObject(triple))), "the URI should not be in the triples until it is described");
    this.container.update(toTriples(toTriple(":o", "rdfs:label", "label")));
    assertThat(this.container.triples(), hasItem(equalToObject(triple)), "the triples contains it");
});
test("add-reverse-uri", function() {
    var triple = new Triple(":s1", ":p", ":s");

    this.container.add(triple);

    var line = this.container.getLines()[0];
    assertThat(line.getDirection(), equalTo(BACKWARD), "the line should be backwards");
    assertThat(line.subject(), equalTo(':s1'), "the line's subject should be the subject of the triple");
    assertThat(line.getObject().isLiteral(), not(truth()), "the object should not be a literal");
    assertThat(line.getObject().isUri(), truth(), "the object should not be a URI");
    assertThat(line.getObject().getObject(), equalTo(':s1'), "the object should be ther object of the triple");

    this.container.update(toTriples(toTriple(":s1", "rdfs:label", "label")));
    ok(this.container.triples().contains(triple), "the triples contains it");

});
test("add-literal", function() {
    var triple = new Triple(":s", ":p", 'a literal');

    this.container.add(triple);
    equal(this.container.getLines().length, 1, "the container has one new line");
    var line = this.container.getLines()[0];

    equal(line.getObject().element.text(), 'a literal', "the line's object displays the literal");

    assertThat(this.container.triples(), hasItem(equalToObject(triple)));

    ok(this.container.triples().contains(triple), "the triples contains it");
    assertThat(line.childTriples(), [], "the line has only one triple (no child triples)");
    ok(line.triples().contains(triple), "the line has the triple");
});
test("update with labels", function() {
    var triples = toTriples(":s :member :line1", ':line1 rdfs:label "foo"');
    this.container.update(triples);
    assertThat(this.container.element.text(), containsString("foo"));
});


test("when I add a triple where the container is the predicate, then nothing happens", function() {
    var triple = new Triple(":s1", ":s", ":o");

    this.container.add(triple);

    ok(!this.container.triples().contains(triple), "the triples does not contains it");
});
test("when I add a triple where the container is the object and subject, then the container contains it", function() {
    var triple = new Triple(":s", ":p", ":s");

    this.container.add(triple);

    this.container.update(toTriples(toTriple(":s", "rdfs:label", "label")));
    ok(this.container.triples().contains(triple), "the triples contains it");

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

    this.container.option("describeElements", false);

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

    var containerElement = $('<ul>').container({query: $.notepad.describeObject(sourceElement), sourceElement: sourceElement});
    var container = containerElement.data('notepadContainer');

    containerElement.endpoint({endpoint: endpoint});        // This container needs an endpoint to retrieve labels
    
    container.load();

    setTimeout( function() {
        verify(endpoint, times(1)).execute();

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

testWithContainer("testWithContainer", toTriples(':s :p :o'), function() {
    var container = this.container;
    container.element.attr('about', ':s');
    container.load();
    setTimeout(function() {
        assertThat(container.getLines().length, 1);
        start();
    }, 200);
});


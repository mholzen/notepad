module("given a container with no uri", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.ul = $('<ul>').container().endpoint({endpoint: this.endpoint});
        this.container = this.ul.data('container');
        this.line = this.ul.find("li:first").data('line');
    },
    teardown: function() {
        this.container.destroy();
    }
});
test("when I load the content, then ", function() {
//    assertThat(this.container.option('endpoint'), equalTo(this.endpoint));
    raises(function() { this.container.load() } , /cannot describe without a URI/, "it should require the URI");
});
test("when I set the URI and load, then", function() {
    this.ul.attr('about', ':s');
    this.container.load();
    verify(this.endpoint, times(1)).describe();
    ok(true);
});

module("given a container with the uri :s", {
    setup: function() {
        this.endpoint = mock(new FusekiEndpoint('http://ex.com'));
        this.ul = $('<ul about=":s">').container().endpoint({endpoint: this.endpoint});
        this.container = this.ul.data('container');
        this.line = this.ul.find("li:first").data('line');
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
    assertThat(line.getObject().value(), equalTo(":o"), "the object should have a value of :o");
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
    assertThat(line.getObject().value(), equalTo(':s1'), "the object should be ther object of the triple");

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
skippedTest("when I narrow down its collection query, then", function() {
    var query =  "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o FILTER (sameTerm(?p, :predicate) && sameTerm({{about}}, ?s)) }";
    this.container.option('query', query);
    equal(this.container.options.query, query, "the query was changed");

    this.container.load();
    verify(this.endpoint, times(1)).execute();  // A query was executed
});
asyncTest("when I configure a container to retrieve triples from another container", function() {
    expect(1);
    var uriElement = $('<p about=":uri">');
    var endpoint = mock(new FusekiEndpoint('http://ex.com'));
    when(endpoint).describe().then( function() {
        var callback = arguments[1];
        callback(new Triples( new Triple(':uri', ":p", ":o"), new Triple(':uri', ":p1", ":o1")));
    });
    uriElement.endpoint({endpoint: endpoint});

    // var describe = function(source, callback) {
    //     endpoint.describe(source.attr('about'), callback);
    // }
    var containerElement = $('<ul>').container({query: $.notepad.queryFromObject(uriElement)});
    //var containerElement = $('<ul>').container({query: describe, source: uriElement});
    var container = containerElement.data('container');
    
    // container.option('source').bind("loaddependant", function() {
    //     container.option('query')(container.option('source'), function(triples) {
    //         container._updateFromRdf(triples);
    //     });
    // });

    container.load();
    //container._trigger("load");

    setTimeout( function() {
        verify(endpoint, times(1)).describe(":uri");
        //verify(container, times(1))._updateFromRdf(anything());

        ok(true);
        start();
    }, 200);

    // var cluster = function(source, callback) {
    //     $.notepad.cluster(source.triples(), callback);
    // }
    // var containerCluster = $('<ul>').container({query: cluster, source: container});
    // containerCluster.option('source').bind("loaddependant", function() {
    //     containerCluster.option('query')(containerCluster.option('source'), function(triples) {
    //         containerCluster._updateFromRdf(triples);
    //     });
    // });


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


//
// SkippedTests
//
skippedTest("when I add a triple to a container, then the notepad learns about the predicate", function() {
    expect(1);

    // GIVEN
    var triple = new Triple(this.container.getUri(), ":p", ":o");

    // when(this.notepad).getRdf(this.container.getUri()).then( function() {
    //     return [':s','rdfs:label','subject label'];
    // });

    when(this.endpoint).getRdf(':p').then( function() {
        return [':p','owl:sameAs',':p2'];
    });

    var linesCountPre = this.container.getLines().length;

    // WHEN
    this.container.add(triple);


    // THEN

    // verify(this.notepad.getRdf(":o"), "should fetch the label for the object");
    
    verify(this.endpoint).getRdf(':p'); //"should learn about the predicate");
    
    ok(this.container.contains(":p owl:sameAs :p2"), "should store what it learned about the predicate");

    // should test this when setting the predicate URI for a line

    equal(this.container.lines().length, linesCountPre+1, "the container should contain one more line");
    ok(this.container.expresses(triple), "the container should express the newly added triple");

    // should do nothing if the triple already expressed    
});
skippedTest("when I add a concept to it", function() {
    var facts = undefined;
    var uri = undefined;
    this.container.appendUri(uri);
    ok(this.notepad.contains(facts), "it displays facts about the concept");
});
skippedTest("when I add one two lines with predicates", function() {
    this.ul.append('<li>Doe, Jon<ul><li rel=":firstName">Jon</li></ul></li>');
    this.ul.append('<li>Dane, Jane<ul><li rel=":firstName">Jane</li></ul></li>');
    ok(this.container.sortBy().length >= 3, "then the list of available sort orders should include sorting by the predicate");
})
skippedTest("when I set the sort order to something non evaluatable, then I raise an exception", function() {        
});
skippedTest("when I set the sort order to something evaluatable, then I raise an exception", function() {
});

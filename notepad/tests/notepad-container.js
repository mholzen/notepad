module("given a new container in a notepad", {
    setup: function() {
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepad');
        this.container = this.notepad.getContainer();
    },
    teardown: function() {
        this.container.destroy();
        this.notepad.destroy();
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

module("given a container ", {
    setup: function() {
        this.ul = $('<ul about=":s">').container();    
        this.container = this.ul.data('container');
        this.line = this.ul.find("li:first").data('line');

        this.endpoint = mock(FusekiEndpoint);
        this.container.endpoint = this.endpoint;
    },
    teardown: function() {
        this.container.destroy();
    }
});

test("when I add a triple to a container, then the container should do nothing", function() {
    expect(1);
    var linesCountPre = this.container.getLines().length;
    this.container.add( new Triple(":aUri", ":p", ":o"));
    equal(this.container.getLines().length, linesCountPre, "the container should add no new lines");
});

test("when I add a triple to a container, then the notepad learns about the predicate", function() {
    expect(1);

    var triple = new Triple(this.container.getUri(), ":p", ":o");

    // when(this.notepad).getRdf(this.container.getUri()).then( function() {
    //     return [':s','rdfs:label','subject label'];
    // });

    when(this.endpoint).getRdf(':p').then( function() {
        return [':p','owl:sameAs',':p2'];
    });

    var linesCountPre = this.container.getLines().length;

    this.container.add(triple);

    // should do nothing if the triple already expressed

    // verify(this.notepad.getRdf(":o"), "should fetch the label for the object");
    
    verify(this.endpoint).getRdf(':p'); //"should learn about the predicate");
    
    ok(this.container.contains(":p owl:sameAs :p2"), "should store what it learned about the predicate");

    // should test this when setting the predicate URI for a line

    equal(this.container.lines().length, linesCountPre+1, "the container should contain one more line");
    ok(this.container.expresses(triple), "the container should express the newly added triple");
    
})


skippedTest("when I add a concept to it", function() {
    var facts = undefined;
    var uri = undefined;
    this.container.appendUri(uri);
    ok(this.notepad.contains(facts), "it displays facts about the concept");
});



{
    skippedTest("when I add one two lines with predicates", function() {
        this.ul.append('<li>Doe, Jon<ul><li rel=":firstName">Jon</li></ul></li>');
        this.ul.append('<li>Dane, Jane<ul><li rel=":firstName">Jane</li></ul></li>');
        ok(this.container.sortBy().length >= 3, "then the list of available sort orders should include sorting by the predicate");
    })
    skippedTest("when I set the sort order to something non evaluatable, then I raise an exception", function() {        
    });
    skippedTest("when I set the sort order to something evaluatable, then I raise an exception", function() {
    });
}

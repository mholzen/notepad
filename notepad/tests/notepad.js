module("given a new notepad", {
    setup: function() {
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepad');
        this.container = this.notepad.getContainer();
        this.line = this.div.find('li').data('line');
    },
    teardown: function() {
        this.notepad.destroy();
    }
});

test("when i place the cursor at the beginning of the line", function() {
    var target = this.div.find("li:first .notepad-object");
    target.val('text');
    target.change();
    target.caretToStart();
    target.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );
    
    equal(this.div.find("li:first .notepad-object").val(), "", "the first line should be empty");
    equal(this.div.find("li:last .notepad-object").val(), "text", "the second line should be where the text remained");
});

test("when I toggle the predicate", function() {
    expect(4);
    equal(this.line.predicate.css('display'),'none', "this predicate should not be displayed initially");
    ok(this.line.predicateToggle, "the toggle should be available");
    
    var line = this.line;
    testAsyncStepsWithPause(200,
        function() {
            line.predicateToggle.trigger(jQuery.Event("click"));
            return function() {
                notEqual(line.predicate.css('display'),'none', "this predicate should be displayed after a click");    
            };
        },
        function() {
            line.predicateToggle.trigger(jQuery.Event("click"));
            return function() {
                equal(line.predicate.css('display'),'none', "this predicate should not be displayed after two clicks");    
            }
        });
});
asyncTest("when set RDF with cycles, then it should not display a triple twice", function() {
    var uri = this.notepad.getUri();
    var triples = Triples(
            new Triple(uri,'rdfs:member','_:line1'),
            new Triple('_:line1','rdfs:member','_:line1')
    );

    this.notepad.endpoint = mock(FusekiEndpoint);
    when(this.notepad.endpoint).getRdf(JsHamcrest.Matchers.anything()).then( function(t,callback) {
        start();
        callback(triples);
    });

    this.line.setUri("_:line1");

    equal(this.line.getUri(), '_:line1', "the first line should be _:line1");
    equal(this.line.getLines().length, 1, "the first line should have one child");
    equal(this.line.getLines()[0].getUri(), '_:line1', "the child line should be the uri _:line1");

    verify(this.notepad.endpoint, times(2)).getRdf('_:line1');
});

asyncTest("when set RDF with a reverse relationship, then it should display it once", function() {
    var uri = this.notepad.getUri();
    var triples = Triples(
            new Triple(uri,'rdfs:member','_:line1'),
            new Triple('_:line2','rdfs:member','_:line1')
    );

    this.notepad.endpoint = mock(FusekiEndpoint);
    when(this.notepad.endpoint).getRdf(JsHamcrest.Matchers.anything()).then( function(t,callback) {
        start();
        callback(triples);
    });

    this.line.setUri("_:line1");

    equal(this.line.getUri(), '_:line1', "the first line should be _:line1");
    equal(this.line.getLines().length, 1, "the first line should have one child");
    equal(this.line.getLines()[0].getUri(), '_:line2', "the child line should be the uri _:line1");

});

function enterNewLine(div) {
    var target = div.find("li .notepad-object");
    target.val('Test a widget');
    target.change();
    target.caretToEnd();
    target.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );
}
test("when create a new line, then it should have two lines", function() {
    enterNewLine(this.div);
    
    equal(this.div.find("li").length, 2, "should have 2 lines");
    equal(this.notepad.triples().length, 3, "the notepad should have 3 triples");

    var line = this.div.find("li:first").data('line');
    equal(line.getLineLiteral(), "Test a widget", "line literal should be the typed text");

    equal(line._getContainerUri(), this.notepad.getUri(), "container URI should be the notepad URI");
    equal(line.getContainerTriple().subject, this.notepad.getUri(), "subject of the container triple should be the notepad URI");
    ok(line.getContainerTriple().predicate, 'rdf:member', "predicate should be member-of");
    equal(line.getContainerTriple().object, line.getUri(), "object should be the line URI");

    equal(line.getLineTriple().subject, line.getUri(), "subject of line tripe should be the line URI");
    equal(line.getLineTriple().predicate, 'rdfs:label', "line triple predicate should be rdfs:label");
    equal(line.getLineTriple().object, line.getLineLiteral(), "line literal object should be empty");
});
test("when I add a second line and type text", function() {
    this.container.appendLine("first line");
    equal(this.container.getLines().length, 2, "the container should have 2 lines");
    equal(this.container.getLines()[0].triples().length, 0, "the first line should not have triples");
    equal(this.container.getLines()[1].triples().length, 3, "the second line should have 3 triples");

    // ok(false,"then the new line should have a default predicate");
    // ok(false,"then the new line should have a URI");
    // equal(this.container.sortBy().length,0, "then the list of available sort orders should be empty");
});
test("when I set the predicate label to a new label, then", function() {
    this.line.element.find('.notepad-predicate').val('a new label');
    this.line.element.find('.notepad-predicate').change();
    this.line.element.find('.notepad-object').val('a new value');
    ok(this.line.getPredicateLabelTriple(), "the line should generate a triple for the predicate");
});
skippedTest("when I set the predicate label to a label that indicates an inverse predicate (e.g ':Person -rdf:type :louis .', then", function() {
    ok(false,"it should save the inverse triple");
});
test("when I append a column with a predicate", function() {
    var predicateUri = "rdf:example";
    var column = this.container.appendColumn(predicateUri);
    ok(this.container.getColumns().length, 1, "the container should have two headers");
    // ok(column, "this column should be defined");
    // equal(1, column.getObjects().length, "the column should have one row");
    // notEqual(column.getObjects()[0].element.css('display'), 'static', "the first cell should be visible");
})
test("when I add two lines", function() {
    this.container.appendLine("first line");
    this.container.appendLine("second line");
    ok(this.container.sortBy().length >= 2, "then the list of available sort orders should have at least 2 elements(decreasing and increasing): " + this.container.sortBy());
});
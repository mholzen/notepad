QUnit.file = "test-notepad.js";
module("given a new div", {
    setup: function() {
        this.div = $("<div>").appendTo("#notepad-container");
    },
    teardown: function() {
        this.div.data('destroy');
    }
});
test("when I create a new notepad with options", function() {
    var endpoint = new Triples(new Triple('rdfs:member', 'rdfs:label', 'label'), new Triple(':a', ':b', ':c'));

    this.div.notepad( {endpoint: endpoint} );

    equal(this.div.data('notepad').getEndpoint(), endpoint, "the notepad should provide the endpoint");
});


module("given a new div", {
    setup: function() {
        this.div = $("#notepad");
    }
});
test("when I create a notepad, it should have initial components", function(){
   this.div.notepad();

   equal(this.div.find("li").length, 1, "should have one line element");

   assertThat(this.div.find("li [contenteditable='true']").length, greaterThan(0), "the first line should have at least one contenteditable area");
   assertThat(this.div.find('li .notepad-predicate-label').length, greaterThan(0), "the first line should have a predicate label");

   var notepad = this.div.data('notepad');
   ok(notepad,"it should have a widget");

   assertThat(notepad.triples(), hasItem(equalToObject(new Triple(notepad.getUri(), "rdf:type", "notepad:Session"))));
   
   // The following tests may be too highly coupled
   equal(notepad.getLines().length,1, "should have one line widget");
   ok(this.div.find('li').data('line'), "a line should provide it's widget");
   ok(this.div.find("li .notepad-predicate").attr('rel'), "the first line's predicate uri should be defined");

   this.div.notepad('destroy');
});
test("when I create a notepad, it should be destroyed cleanly", function() {
    this.div.notepad();
    var notepad = this.div.data('notepad');
    notepad.destroy();

    equal(this.div.children().length,0,"it leaves children element");
    ok(!this.div.hasClass('notepad'),"it leaves the class 'notepad'");
    ok(!this.div.attr('about'),"it leaves the attribute 'about'");
});


module("given a new notepad", {
    setup: function() {
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepad');
        this.endpoint = new FusekiEndpoint('http://localhost:3030/test');
        this.endpoint.graph = $.notepad.getNewUri();
        this.notepad.option('endpoint', this.endpoint);
        this.container = this.notepad.getContainer();
        this.line = this.div.find('li').data('line');
    },
    teardown: function() {
        this.notepad.destroy();
    }
});
skippedTest("when i place the cursor at the beginning of the line", function() {
    var target = this.div.find("li:first .notepad-object");
    assertThat(target.caret(), not(equalTo(undefined)), "we need a way to know cursor position in a contenteditable div")
    target.text('text');
    target.change();
    target.caretToStart();
    target.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );
    
    equal(this.div.find("li:first .notepad-object").text(), "", "the first line should be empty");
    equal(this.div.find("li:last .notepad-object").text(), "text", "the second line should be where the text remained");
});
test("when set RDF with cycles, then it should not display a triple twice", function() {
    expect(6);
    var uri = this.notepad.getUri();
    var triples = Triples(
            new Triple(uri,'rdfs:member',':line1'),
            new Triple(':line1','rdfs:member',':line1')
    );

    var test = this;
    testAsyncStepsWithPause(200,
        function() {
            test.endpoint.insertData(triples);
            return function() {
                ok(true,'inserted');
            }
        },
        function() {
            test.line.setUri(":line1");  // This triggers a load we need to wait for
            return function() {
                equal(test.line.getUri(), ':line1', "the first line should be :line1");
                assertThat(test.line.getDirection(), equalTo(FORWARD), "the line should express a forward triple");
                assertThat(test.line.getContainerUri(), uri, "the line should belong to the notepad container");

                assertThat(test.line.getLines().length, equalTo(1), "the first line should have one child");
                assertThat(test.line.getLines()[0].getUri(), ':line1', "the child line should be the uri :line1");                
            }
        });
});
// depends on displaying reverse triples
skippedTest("when set RDF with a reverse relationship, then it should display it once", function() {
    expect(4);
    var uri = this.notepad.getUri();
    var triples = Triples(
            new Triple(uri,'rdfs:member',':line1'),
            new Triple(':line2','rdfs:member',':line1')
    );

    this.notepad.endpoint = new FusekiEndpoint('http://localhost:3030/test');
    this.notepad.endpoint.graph = 'ex' + $.notepad.getNewUri();

    var test = this;
    testAsyncStepsWithPause(200,
        function() {
            test.notepad.endpoint.insertData(triples);
            return function() {
                ok(true,'inserted');
            };
        },
        function() {
            test.line.setUri(":line1");
            return function() {
                equal(test.line.getUri(), '_:line1', "the first line should be _:line1");
                equal(test.line.getLines().length, 1, "the first line should have one child");
                equal(test.line.getLines()[0].getUri(), '_:line2', "the child line should be the uri _:line1");
            };
        }
    );
});
function enterNewLine(div) {
    var target = div.find("li .notepad-object3");
    target.text('Test a widget');
    target.change();
    target.caretToEnd();
    target.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );
}
test("when create a new line, then it should have two lines", function() {
    enterNewLine(this.div);

    assertThat(this.div.find("li").length, 2, "should have 2 lines");

    var line = this.div.find("li:first").data('line');
    equal(line.getLineLiteral(), "Test a widget", "line literal should be the typed text");
});
test("when I add a second line with text", function() {
    this.container.appendLine();
    assertThat(this.container.getLines().length, equalTo(2), "the container should have 2 lines");
});
skippedTest("when I set the predicate label to a new label, then", function() {
    this.line.element.find('.notepad-predicate').val('a new label');
    this.line.element.find('.notepad-predicate').change();
    this.line.element.find('.notepad-object').text('a new value');

    assertThat(this.line.triples().triples(undefined, "rdfs:label", 'a new labe'), []);
    ok(false);

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



module("given a notepad with one line of text", {
    setup: function() {
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepad');
        this.firstLineElement = this.div.find("li:first");
        this.firstObject = this.div.find("li:first .notepad-object3");
        this.firstObject.val("first line").change();

        this.firstLine = this.div.find("li:first").data('line');
        this.line = this.firstLine;
        this.lastLine = this.div.find("li:last").data('line');
    },
    teardown: function() { this.notepad.destroy(); }    
});
test("when I indent the first line, then it should not move", function() {
    var parentBefore = this.firstLineElement.parent();
    var result = this.firstLine.indent();
    ok(!result, "it should return false");
    var parentAfter = this.firstLineElement.parent();
    deepEqual(parentAfter, parentBefore, "the parent element of the line should not changed");
});
test("when I unindent the first line, then it should not move", function() {
    var parentBefore = this.firstLineElement.parent();
    var result = this.firstLine.unindent();
    ok(!result, "it should return false");
    var parentAfter = this.firstLineElement.parent();
    deepEqual(parentAfter, parentBefore, "the parent element of the line should not changed");
});



module("given a notepad with two lines", {
    setup: function() {
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepad');
        this.firstObject = this.div.find("li:first .notepad-object3 [contenteditable='true']");
        this.firstObject.text("first line").change();

        this.firstObject.caretToEnd();
        this.firstObject.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );

        this.lastObject = this.div.find("li:last .notepad-object3")
        this.lastObject.text("second line").change();

        this.firstLine = this.div.find("li:first").data('line');
        this.line = this.firstLine;
        this.lastLine = this.div.find("li:last").data('line');
    },
    teardown: function() { this.notepad.destroy(); }    
});
skippedTest("when I delete the predicate label, it should delete the line triple", function() {

    $(".notepad-predicate:first").addClass("delete");

    equal(this.line.getContainerTriple().operation, "delete", "the line triple should be deleted");

    deepEqual(this.notepad.deletedTriples(), [this.line.getContainerTriple()], "the line triple should be in the deleted triples");
})
function indentSecondLine(div) {
    var target = div.find("li:last .notepad-object3");
    target.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.TAB }) );
}
test("when I indent the second line,", function() {
    indentSecondLine(this.div);
    assertThat($.contains(this.div.find("li:first"), this.div.find("li:last")), truth(), "second line should be under the first");
});
test("when I set unrelated RDF,", function() {
    var triplesPre = this.notepad.triples();

    this.notepad.setRdf([new Triple(':aUri',':aPredicate',':anotherUri')]);
    deepEqual(this.notepad.triples(), triplesPre, "the triples should remain the same");
});
test("a new line should update labels from RDF", function() {
    this.line._setUri('_:lineUri');
    this.notepad.getContainer()._updateLabelsFromRdf( [ new Triple('_:lineUri','rdfs:label','line label') ] );
    equal(this.line.getLineLiteral(),'line label','line label should be set by RDF retrieved');
});
skippedTest("a new line should display RDF when setting its URI", function() {
    expect(1);
    this.notepad.endpoint = mock(FusekiEndpoint);
    when(this.notepad.endpoint).getRdf('_:lineUri').then( function() { 
        start();
        return ['_:lineUri','rdfs:label','line label'];
    });
    stop();
    this.line.setUri('_:lineUri');

    verify(this.notepad.endpoint).getRdf('_:lineUri');
    ok(true, "test complete");
    // TODO: figure out how (and when) to test that the line label was properly set
    // equal(line.getLineLiteral(),'line label','line label should be set by RDF retrieved');
});
test("a notepad should display RDF", function() {
    var uri = this.notepad.getUri();

    this.notepad.endpoint = mock(FusekiEndpoint);
    when(this.notepad.endpoint).getRdfBySubjectObject('_:line1').then( function() {
        start();
        return ['_:line1','rdfs:label','line label'];
    });

    this.notepad.setRdf( [ new Triple(uri,'rdf:Seq','_:line1') ] );
    ok(this.div.find('li[about="_:line1"]'), "Should be able to find a line with the URI");
    equal(this.div.find('li[about="_:line1"] .notepad-object').text(), '', "First line should be empty");
});
test("when I hit enter at the end of the first line, then it should add a newline before the second line", function() {
    this.firstObject.caretToEnd();
    this.firstObject.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );

    equal(this.div.find("li:eq(0)").data('line').getLineLiteral(),"first line");
    assertThat(this.div.find("li:eq(1)").data('line').getLineLiteral(), not(truth()));
    equal(this.div.find("li:eq(2)").data('line').getLineLiteral(),"second line");
});



module("given a notepad with two lines (first empty, second with a label)", {
    setup: function() {
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepad');
        enterNewLine(this.div);
        this.firstLine = this.div.find("li:first").data('line');
        this.line = this.firstLine;
        this.lastLine = this.div.find("li:last").data('line');
    },
    teardown: function() { this.notepad.destroy(); }
});
test("when I add a triple that is being expressed but is not yet retrieve, then I should not add it to the container", function() {
    // for example, with a label being redisplayed as a child of the node
    // must ignore triples that are being expressed by a notepad-object
    ok(true);
});
test("when I add a triple describing membershipt to a notepad, then it should filter it out", function() {
    ok(true);
});
skippedTest("when I save, then the empty line should save because it has a child", function() {
});



module("given a notepad with a line and a child line", {
});
skippedTest("when I unindent the second line, then the second line relatinoship to the first line should be deleted", function() {
});

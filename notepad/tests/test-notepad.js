QUnit.file = "test-notepad.js";

module("given a new div", {
    setup: function() {
        this.div = $("#notepad");
    }
});
test("when I create a notepad, it should have initial components", function(){
   this.div.notepad({endpoint: toTriples()});

   equal(this.div.find("li").length, 1, "should have one line element");

   assertThat(this.div.find("li [contenteditable='true']").length, greaterThan(0), "the first line should have at least one contenteditable area");
   assertThat(this.div.find('li .notepad-predicate-label').length, greaterThan(0), "the first line should have a predicate label");

   var notepad = this.div.data('notepadNotepad');
   ok(notepad,"it should have a widget");

   assertThat(notepad.triples(), hasItem(equalToObject(toTriple(notepad.getUri(), "rdf:type", "notepad:Session"))));
   
   // The following tests may be too highly coupled
   equal(notepad.getLines().length,1, "should have one line widget");
   ok(this.div.find('li').data('notepadLine'), "a line should provide it's widget");
   ok(this.div.find("li .notepad-predicate").attr('rel'), "the first line's predicate uri should be defined");

   this.div.notepad('destroy');
});
test("when I create a notepad, it should be destroyed cleanly", function() {
    this.div.notepad({endpoint: toTriples()});
    var notepad = this.div.data('notepadNotepad');
    notepad.destroy();

    equal(this.div.children().length,0,"it leaves children element");
    ok(!this.div.hasClass('notepad'),"it leaves the class 'notepad'");
    ok(!this.div.attr('about'),"it leaves the attribute 'about'");
});


module("given a new notepad", {
    setup: function() {
        $("#notepad").remove();
        $("<div id='notepad'><h1 rel='rdfs:label'></h1></div>").appendTo("#qunit-fixture");
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepadNotepad');
        this.endpoint = new FusekiEndpoint('http://localhost:3030/test');
        this.endpoint.graph = $.notepad.getNewUri();
        this.notepad.option('endpoint', this.endpoint);
        this.container = this.notepad.getContainer();
        this.line = this.div.find('li').data('notepadLine');
    },
    teardown: function() {
        this.notepad.destroy();
    }
});

asyncTest("when set RDF with cycles, then it should not display a triple twice", function() {

    // WARNING: this test has a race condition that makes it fail once every other time.
    // I don't understand this failure at this point.
    expect(6);
    var uri = this.notepad.getUri();
    var triples = toTriples([toTriple(uri,'rdfs:member',':line1'),toTriple(':line1','rdfs:member',':line1')]);

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
                start();
            }
        });
});
function enterNewLine(div) {
    var target = div.find('li [contenteditable="true"]');
    target.text('Test a widget');
    target.change();
    target.caretToEnd();
    target.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );
}
asyncTest("newline beginning", function() {
    enterNewLine(this.div);
    assertThat(this.div.find("li").length, 2, "should have 2 lines");

    var line = this.div.find("li:first").data('notepadLine');
    equal(line.getLiteral(), "Test a widget", "line literal should be the typed text");

    setTimeout(function() { start(); }, 500);
});

module("given a notepad with one line of text", {
    setup: function() {
        this.div = $("#notepad").notepad({endpoint: toTriples()});
        this.notepad = this.div.data('notepadNotepad');
        this.firstLineElement = this.div.find("li:first");
        this.firstObject = this.div.find("li:first .notepad-object3");
        this.firstObject.val("first line").change();

        this.firstLine = this.div.find("li:first").data('notepadLine');
        this.line = this.firstLine;
        this.lastLine = this.div.find("li:last").data('notepadLine');
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
        this.notepad = this.div.data('notepadNotepad');
        this.firstObject = this.div.find("li:first .notepad-object3 [contenteditable='true']");
        this.firstObject.text("first line").change();

        this.firstObject.caretToEnd();
        this.firstObject.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );

        this.lastObject = this.div.find("li:last .notepad-object3")
        this.lastObject.text("second line").change();

        this.firstLine = this.div.find("li:first").data('notepadLine');
        this.line = this.firstLine;
        this.lastLine = this.div.find("li:last").data('notepadLine');
    },
    teardown: function() { this.notepad.destroy(); }    
});
function indentSecondLine(div) {
    var target = div.find("li:last .notepad-object3");
    target.trigger($.Event("keydown", { keyCode: $.ui.keyCode.TAB }));
}
test("when I indent the second line,", function() {
    indentSecondLine(this.div);
    assertThat($.contains(this.div.find("li:first")[0], this.div.find("li:last")[0]), truth(), "second line should be under the first");
});
test("when I set unrelated RDF,", function() {
    var triplesPre = this.notepad.triples();

    this.notepad.setRdf(toTriples(toTriple(':aUri',':aPredicate',':anotherUri')));
    deepEqual(this.notepad.triples(), triplesPre, "the triples should remain the same");
});
test("a new line should update labels from RDF", function() {
    var uri = this.line.getUri();
    this.notepad.getContainer()._updateLabelsFromRdf( toTriples(toTriple(uri,'rdfs:label','line label')) );
    assertThat(this.line.getLiteral(),'line label','line label should be set by RDF retrieved');
});
test("a notepad should display RDF", function() {
    var uri = this.notepad.getUri();

    this.notepad.endpoint = mock(FusekiEndpoint);
    when(this.notepad.endpoint).getRdfBySubjectObject('_:line1').then( function() {
        start();
        return ['_:line1','rdfs:label','line label'];
    });

    this.notepad.setRdf( [ toTriple(uri,'rdf:Seq','_:line1') ] );
    ok(this.div.find('li[about="_:line1"]'), "Should be able to find a line with the URI");
    equal(this.div.find('li[about="_:line1"] .notepad-object').text(), '', "First line should be empty");
});

test("newline end-of-line", function() {

    // Warning: for some reason, i cannot use this.firstObject.  It holds a detached element.
    var firstObject = this.notepad.element.find("li:first .notepad-object3 [contenteditable='true']");
    firstObject.caretToEnd();
    firstObject.focus();

    firstObject.trigger(jQuery.Event("keydown", { keyCode: $.ui.keyCode.ENTER }) );

    assertThat(this.div.find("li:eq(0)").text(), containsString("first line"));
    assertThat(this.div.find("li:eq(1)").text(), not(containsString("first line")));
    assertThat(this.div.find("li:eq(2)").text(), containsString("second line"));
});



module("given a notepad with two lines (first empty, second with a label)", {
    setup: function() {
        this.div = $("#notepad").notepad();
        this.notepad = this.div.data('notepadNotepad');
        enterNewLine(this.div);
        this.firstLine = this.div.find("li:first").data('notepadLine');
        this.line = this.firstLine;
        this.lastLine = this.div.find("li:last").data('notepadLine');
    },
    teardown: function() { this.notepad.destroy(); }
});
test("when I add a triple that is being expressed but is not yet retrieve, then I should not add it to the container", function() {
    // for example, with a label being redisplayed as a child of the node
    // must ignore triples that are being expressed by a notepad-object
    ok(true);
});
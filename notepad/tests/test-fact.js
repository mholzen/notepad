QUnit.file = "notepad-fact.js: ";
module("given an empty element", {
    setup: function() {
        this.element = $("<div>");
        this.element.appendTo("#qunit-fixture");
        this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
        this.element.endpoint({endpoint: this.endpoint});
    }
});
test("when I create a new fact", function() {
    this.element.fact();
    var fact = this.element.data('fact');
    assertThat(fact, truth(), "it has a fact widget");
    assertThat(fact.triples().length, equalTo(0), "it has no triples");
});

test("when I create a new fact and a triple", function() {
    this.element.fact();

    var fact = this.element.data('fact');
    var triple = new Triple(':s', ':p', ':o');
    fact.setUri(':s')
    fact.add(triple);

    assertThat(fact.getUri(), equalTo(':s'));
    assertThat(fact.getSubjectLabel(), truth());

    assertThat(fact.getPredicates(':p').length, equalTo(1));
    assertThat(fact.triples(), everyItem(equalToObject(triple)));
});


// module("given a element with a representation", {
//     setup: function() {
//         this.element = $('<div about=":s" rel=":p">a literal</div>');
//         // this.element = $('<div about=":s" rel=":p"><div about=":o"/><div>');
//         // this.element = $('<div about=":s"><div class="label">S</div> <div rel=":p"><div class="label">P</div> <div about=":o"/><div>');
//         this.text = "initial label";
//         this.element.text(this.text);
//     }
// });
// test("when I create a new label", function() {
//     var label = this.element.label().data('label');

//     assertThat(label.isLiteral(),   truth(),            "then label is a literal");
//     assertThat(label.isUri(),       not(truth()),       "then label is not a URI");
//     assertThat(label.getLiteral(),  equalTo(this.text), "then initial label is equal to the initial object text");
//     assertThat(label.triple(),   nil(),              "there is no triple associated");
// });


// module("given a new fact", {
//     setup: function() {
//         this.element = $("<div>");
//         this.endpoint = mock(new FusekiEndpoint("http://ex.com"));
//         this.element.endpoint({endpoint: this.endpoint});
//         this.fact = this.element.fact().data('fact');
//     }
// });
// test("when I set the URI", function() {
//     this.fact.setUri(':s');
//     assertThat(this.fact.getSubjectLabel(), truth(), "it has a subject label");
// });






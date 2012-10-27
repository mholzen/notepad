module("given a new line", {
    setup: function() {
        this.element = $('<p>').line();
        this.line = this.element.data('notepad.line');

        this.endpoint = mock(FusekiEndpoint);
        this.line.endpoint = this.endpoint;

    },
    teardown: function() {
        this.line.destroy();
    }
});
// test("when I don't change anything, then", function(){
//     when(this.endpoint).getRdf(anything()).thenReturn(
//         new Triples( new Triple(':s', 'rdfs:label', 'S') )
//     );

//     this.setUri(":s");

//     equal(this.line.getLineLiteral(),'S', "the line literal should depend on the label"); 

// });

// test("when I set the query to a list of triples", function(){
//     when(this.endpoint).getRdf(JsHamcrest.Matchers.anything()).thenReturn(
//         new Triples(
//             new Triple(':s', 'dc:source', 'source'),
//             new Triple(':s', 'dc:summary', 'summary')
//         )
//     );

//     this.setUri(":s");

//     this.line.setQuery(["dc:source", "dc:summary", "dc:when"]);
//     equal(this.line.getLineLiteral(),'source', "the line literal should depend on the first triple"); 
// });


// It's acceptable to have:
//  :email   email:subject   "An email subject" .
// convert to
//  :email   email:subject   "An email subject" .
//  :email   email:subject   :x-y-z
//  :x-y-z   rdfs:label      "An email subject"

// so:

// when I change a literal, then I can simply add the triple (:x-y-z, rdfs:label, "...") and delete the triple with the literal
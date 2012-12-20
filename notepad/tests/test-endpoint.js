QUnit.file = "test-endpoint.js";

module('given two collections of triples', {
    setup: function() {
        this.triples1 = mock(new Triples(
            new Triple('ex:s1','ex:p','ex:o'),
            new Triple('ex:s2','ex:p','ex:o')
        ));
        this.triples2 = mock(new Triples(
            new Triple('ex:s1','rdfs:label','S1'),
            new Triple('ex:s2','rdfs:label','S2')
        ));
    }
});
// test("when I create a chain endponit, then", function() {
//     var chainEndpoint = new ChainEndpoint(this.triples1, this.triples2);

//     var triples = new Triples();
//     var mockTriples = mock(triples);
//     assertThat(JsMockito.isMock(mockTriples), truth(), "the variable should be a mock");

// 	//when(mockTriples).subjects().then(function(){foo(); });

//     //when(this.triples1).execute(anything(), anything()).then(function(){foo(); });

//     chainEndpoint.execute("foo");

//     verify(this.triples1).execute("foo");
//     verify(this.triples2, times(3)).execute("foo");
// });

module("notepad", {
	setup: function() {
		this.expectation = new Expectation ( $.notepad.expectations.triples('inst:revLabel', undefined) );
	}
});

testWithTriples("ask false",
	toTriples(':s notepad:inverseLabel "a reverse label"'),
	function() {
		this.expectation.verify(this.endpoint).done(function(response) {
			assertThat(response.boolean, false);
			start();
		});
	}
);

testWithTriples("ask true",
	toTriples(':s inst:revLabel "a reverse label"'),
	function() {
		this.expectation.verify(this.endpoint).done(function(response) {
			assertThat(response.boolean, true);
			start();
		});
});
testWithTriples("count",
	toTriples(':s notepad:inverseLabel "a reverse label"'),
	function() {
		this.endpoint.execute('construct { ?s inst:revLabel ?o } WHERE { ?s notepad:inverseLabel ?o }', function (triples) {
			assertThat(triples.length, 1);
			start();
		});
});

testWithTriples("dataset with one inst:uses statement passes the expectation",
	toTriples(':s notepad:inverseLabel "a reverse label"'),
 	function() {

	// var dataset = toTriples(':s inst:revLabel "a reverse label"');
	var dataset = this.endpoint;
	// dataset = endpoint + dataset URI

	var expectation = this.expectation;

	expectation.verify(dataset).done(function(response) {
		assertThat(response.boolean, false, "dataset does initially not meet the expectation");

		expectation.verifyAndUpdate(dataset).done(function(response) {
			setTimeout(function() {
				expectation.verify(dataset).done(function(response) {
					assertThat(response.boolean, true, "after update, dataset passes the expectation");
					start();
				});
			}, 100);
		});
	});
});


// test("notepad knows about itself", function() {
// 	assertThat(this.notepad.triples(), hasItem('notepad:app', 'a', 'inst:Notepad'));
// });

// test("notepad uses inst:revLabel", function() {
// 	assertThat(this.notepad.triples(), hasItem('notepad:app', "inst:expects", 'inst:revLabel'));
// });

// test("notepad knows about expectations", function() {
// 	assertThat(this.notepad.triples(), hasItem('inst:revLabel', "inst:test", undefined));
// 	assertThat(this.notepad.triples(), hasItem('inst:revLabel', "inst:update", undefined))
// });

var triples = toTriples(
	':s rdfs:member :line1 ',
	':line1 rdfs:label "line1" '
	);

testWithContainer("remove line should delete the container triple", triples, function() {
	var container = this.container;
	var session = container.element.session().data('notepadSession');

	container.setUri(':s').done(function() {
		assertThat(container.triples(), hasSize(greaterThanOrEqualTo(1)));
		// the line is loading the label, but it should have at least the membership triple

		assertThat(session.loaded(), hasItem(':s rdfs:member :line1 .'));
		assertThat(session.removed(), []);

		var line1 = container.getAllLines()[0];
		line1.remove();		// detach and unload

		assertThat(session.removed(), hasItem(':s rdfs:member :line1 .'));  // improve: remove need for ending ' .'
		assertThat(session.removed(), not(hasItem(':line1 rdfs:label "line1" .')));

		start();
	});
});

testWithContainer("delete line should delete all triples", triples, function() {
	var container = this.container;
	var session = container.element.session().data('notepadSession');

	container.setUri(':s').done(function() {
		var line1 = container.getAllLines()[0];

		line1.getObject().uri().pending().then(function() {

			assertThat(container.triples(), hasSize(greaterThanOrEqualTo(1)));
			// the line is loading the label, but it should have at least the membership triple

			assertThat(session.loaded(), hasItem(':s rdfs:member :line1 .'));
			assertThat(session.removed(), []);

			line1.delete();

			assertThat(session.removed(), hasItem(':s rdfs:member :line1 .'));  // improve: remove need for ending ' .'
			assertThat(session.removed(), hasItem(':line1 rdfs:label "line1" .'));

			start();
		});
	});
});

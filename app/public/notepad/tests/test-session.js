test("session", function() {
	var container = $('<ul about=":s">').container().data('notepadContainer');

	var session = $("<div>").session().data('notepadSession');

	container.element.appendTo(session.element);

    container.add(toTriple(':s :p :o'));
    container.update(toTriples(':o rdfs:label "text"'));

    assertThat(container.triples(), hasItem(':s :p :o .'));

    assertThat(session.added(), hasItem(':s :p :o .'), "an added triple should be in the session");
});
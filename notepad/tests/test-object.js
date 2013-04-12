test("create", function() {
	var object = $('<div>').object().data('notepadObject');

	assertThat(object.triples(), []);
});

test("create-with-literal", function() {
	var element = $('<div>123</div>').object();

	element.appendTo( '<div about=":s" rel=":p">' );

	assertThat(element.data('notepadObject').triples(), hasItem(':s :p "123" .'));
});

var triples = toTriples(
':session rdfs:member :b',
':a rdfs:member :b'
// ':session rdfs:label "session"',
// ':a rdfs:label "a"',
// ':b rdfs:label "b"'
);

var triples = toTriples(":s1 :p :s2", ":s2 :p :s3", ':s3 :p :s1');
triples.add(toTriples(
	':s1 rdfs:label "S1"',
	':s2 rdfs:label "S2"',
	':s3 rdfs:label "S3"'));

test("create", function() {
	var triples = toTriples(":s1 :p :s2", ":s1 :p :s3", ':s2 :p :s3', ':s4 :p :s5');
	triples.add(toTriples(
		':s1 rdfs:label "S1"',
		':s2 rdfs:label "S2"',
		':s3 rdfs:label "S3"',
		':p rdfs:label "P"'
		));

	var div = $('<div>').appendTo('#fixture');

	var graph = div.graph({data: triples}).data('notepadGraph');

	assertThat(graph._svg);
})
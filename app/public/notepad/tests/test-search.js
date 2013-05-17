test("wordRegExp", function() {
	var literal = "a label with multiple words";
	var matcher = new $.notepad.WordRegExp("label mult");

	assertThat(matcher.exec(literal), truth());
	assertThat(matcher.highlight(literal), 'a <span class="highlight">label</span> with <span class="highlight">mult</span>iple words');
});

var triples = toTriples(
	':c rdfs:label "label"',
	':c rdfs:member :s'
);
testWithContainer("rdfs:member behaves differently", triples, function() {
	var query = new Query ("SELECT ?start WHERE {  ?start rdfs:label ?label . ?start ?p ?end FILTER (?p = rdfs:member). }");

	// The following query doesn't work.  Why?
	// var query = new Query ("SELECT ?start WHERE {  ?start rdfs:label ?label . ?start rdfs:member ?end . }");

	query.execute(this.endpoint, {}, function(response) {
		assertThat(response.results.bindings, hasItem(hasMember('start',hasMember('value', containsString("#c")))));
		console.log(response);
		console.log(JSON.stringify(response.results.bindings));
		start();
	});
});

function search(endpoint, literal, callback) {
	var matcher = new $.notepad.WordRegExp(literal);
	var matchers = matcher.wordMatchers();
	matchers.forEach(function(match, index) {
		match.index = index;
	});
	var context = {
		words: matchers,
		regexp: matcher.regexp().source
	}
	var query = $.notepad.queries.find_match_by_path;
	return query.execute(endpoint, context, callback);
}

var triples = toTriples(
	':s rdfs:label "a start label "',
	':p rdfs:label "a predicate label"',
	':o rdfs:label "an end label"',
	':s :p :o'
);
testWithContainer("query", triples, function() {
	search(this.endpoint, "start end", function(matches) {
		assertThat(matches.literal(":s", 'inst:reason'), containsString("pred"));
		console.log(matches.pp());
		start();
	});
});

testWithContainer("query", triples, function() {
	search(this.endpoint, "start pred", function(matches) {
		assertThat(matches.literal(":s", 'inst:reason'), containsString("end"));
		console.log(matches.pp());
		start();
	});
});

var triples = toTriples(
	':s rdfs:label "start label "',
	':p1 rdfs:label "predicate label 1"',
	':p2 rdfs:label "predicate label 2"',
	':o1 rdfs:label "end label 1"',
	':o2 rdfs:label "end label 2"',
	':s :p1 :o1',
	':s :p2 :o2'
);
testWithContainer("query two ends", triples, function() {
	search(this.endpoint, "start end", function(matches) {
		assertThat(matches.literals(undefined, 'inst:reason'), hasSize(2));
		console.log(matches.pp());
		start();
	});
});


// function Request(query, context) {
// 	this.query = query;
// 	this.context = context;
// }
// Request.prototype = {
// 	matchHighlights: function(response) {
// 		var matches = requestRegex(request).exec( request );

// 	}
// }

// function findSubjectLabels(matching) {
// 	if (matching instanceof RegExp) {
// 		var query = $.notepad.queries.find_subject_label_by_regexp;
// 		return query.request(matching);
// 	}
// }




// var triples = toTriples(
// 	':s rdfs:label "a label with multiple words"'
// );
// testWithContainer("autocomplete", triples, function() {

// 	var literal = "label mult";
// 	var matcher = new $.notepad.WordRegExp(literal);

// 	// a query that expects to return a set of elements
// 	var queryForSet = $.notepad.queries.find_match_by_path;

// 	this.endpoint.execute(queryForSet).done(function(queryMatches) {

// 		var label = queryMatches[0].object.toString();

// 		var labelMatches = matcher.exec(label);

// 		var highlighted = label.replace(matcher, function(match) {
// 			return $('<span class="match">').text(match).html();
// 		});
// 		console.log(highlighted);

// 		var highlights = $("<div>").html(highlighted);
// 		assertThat(highlights, truth());		
// 		console.log(highlights.html());

// 		start();
// 	});

// });

// function matchHighlights(response, request) {
// 	var matches = requestRegex(request).exec( request );

// 	assertThat(matches, hasSize(2));
// 	debugger;

// }

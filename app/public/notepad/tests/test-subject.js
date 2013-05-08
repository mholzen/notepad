// should: if the triples passed to urilabel.setUri() don't contain all data (ie missing 'rdfs:label'), it will not be loaded, and will be missing
// urilabel.setUri ( ':s', [ ':s :p "literal" '] );


// Solution:
// urilabel.setUri inspects whether it has empty objet locations that need to be queried for
//		urilabel has predicates with no value ther
//		urilabel.objectLocations().filter(empty())
//
// OR

// Refactor urilabel into subject




// - applies to elements that have an about attribute
// 		$("[about]").subject()
test("applies", function() {

	$('<div about=":s">').subject();

});


// - It provides a default template
// <div about=":s">
// 	<div class="template notepad-predicate" rel="rdfs:label">
// 		<div class="notepad-literal">




// - The template can be overriden by the DOM
// <div about=":s">
// 	<div class="template notepad-predicate" rel="rdfs:source">
// 		<div class="notepad-literal">
// 	<div class="template notepad-predicate" rel="rdfs:when">
// 		<div class="notepad-literal">

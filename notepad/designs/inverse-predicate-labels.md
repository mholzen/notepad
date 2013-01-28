INVERSE PREDICATE LABELS
========================

Starting RDF

	vh:marc   vh:works-on   vh:instruct  .

	vh:works-on  rdfs:label  		"works on" .
	marc 		"works on"			"instruct"

	vh:works-on  rdfs:inverseLabel  "has team member" .
	instruct	"has team member"  	Marc


Selecting a predicate URI from a label
--------------------------------------

Autocomplete selections should look like:

	label.select( predicateUri rdfs:label label )
	or
	label.select( predicateUri rdfs:inverseLabel inverselabel )

Which results in the following HTML:

	<div about=":s">
		<div class="label" about=":predicateUri">
			<div rel="rdfs:label">label</div>
			or
			<div rel="rdfs:inverseLabel">inverselabel</div>
		</div>
		<div class="predicate" rel=":predicateUri">

How do we make the label impact the rel/rev direction of the predicate?

	label.on("urichange", function() {
		predicate.updateFromLabel( label.triples() );
			// x rdfs:label "foo"
				-> forward
			// y rdfs:inverseLabel "bar"
				-> inverse
	}


Displaying a predicate label
----------------------------

	<div about=":s">
		<div class="label" about=":predicateUri">
			<div rel="rdfs:label">label</div>
		</div>

		<div rel=":predicateUri">

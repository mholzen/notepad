TEMPLATES - Triples to context
==============================

Object is a URI
---------------
	s p uri .  
	=>
	{ p: {uri: } }


Object is a plain literal
-------------------------
	s p "literal" . 
	=>
	{ p: { "xsd:string" : "literal" } }

Object is a typed literal
-------------------------
	s p "27"^^xsd:integer . 
	=>
	{ p: { "xsd:integer" : "27" } }


Object is a plain literal, augmented with rdfs:range
----------------------------------------------------

	<s> <p> "2/3/13" .
	<p> rdfs:range "xsd:date" .

	{ p: { "xsd:string" : "2/3/13", "xsd:date": Date object? } }


	<s> <p> "<h1>foo</h1>" .
	<p> rdfs:range "xsd:XMLLiteral" .

	{ p: { "xsd:string" : "<h1>foo</h1>", "xsd:XMLLiteral": DOM object? } }

Single triple
-------------

	s p o1
	=>
	{ p: o1 }


Multiple triples with one predicate (warning, subject is ignored)
-----------------------------------------------------------------

	s p o1
	s p o2
	=>
	{ p: [o1, o2]}

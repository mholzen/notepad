TEMPLATES - DOM - BASED
=======================

# GOAL: can we design a templating system that does not use string interpolation, but uses DOM objects and attributes directly.

## Examples

### Simple: triple matched by subject and predicate
		<div about=":s" rel="rdfs:label">
	+
		:s rdfs:label foo
	=
		<div about=":s" rel="rdfs:label">foo</div>

### Triple ignored
		<div>
	+
		:s rdfs:label foo
	=
		<div>

### Triple matched by predicate only
		<div rel="rdfs:label">
	+
		:s rdfs:label foo
	=
		<div about=":s" rel="rdfs:label">foo</div>

### Triple replaced by new value

		<div about=":s" rel="rdfs:label">foo</div>
	+
		:s rdfs:label bar
	=
		<div about=":s" rel="rdfs:label">bar</div>


### Triple added to collection

		<ul subPropertyOf="rdfs:member">
			<li class="template">The model to use for every new line: <div rel="rdfs:member"/> </li>
		</ul>
	+
		:s rdfs:member ( :o1, :o2 ) .
	=
		<ul subPropertyOf="rdfs:member">
			<li>The model to use for every new line: <div rel="rdfs:member" about=":o1"/> </li>
			<li>The model to use for every new line: <div rel="rdfs:member" about=":o2"/> </li>
			<li class="template">The model to use for every new line: <div rel="rdfs:member"/> </li>
		</ul>

	.template { display: none; }		// could use this to hide the model

Attribute `subPropertyOf` could be simply `add`.



# USING MUSTACHE (should: replace with DOM-based)


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

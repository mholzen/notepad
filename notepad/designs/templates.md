TEMPLATES - Triples to context
==============================

when applying a triple to a template
one template behaviour is to replace, another could be to append

REPLACE:
	<div rel="rdfs:label">

APPEND
	<ul subprop="rdfs:member">
		<li>
	</ul>
or
	<ul>
		<li rel="rdfs:member">
	</ul>

beyond that, the template needs "meta information" to know how process differently the triple (sort, filter, etc... for instance)

Question: how does a template define how a new item should be added to a list?

NOTEPAD TEMPLATE
<div>
	<h1 rel="rdfs:label"></h1>
	<ul class="notepadContainer">




RELATED TO:  Query

this.options.query





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

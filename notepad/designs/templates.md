TEMPLATES - Triples to context
==============================

Object is a URI
---------------
	s p uri .  
	=>
	{ p: {uri: } }


Object is a literal
-------------------
	s p "literal" . 
	=>
	{ p: { "xsd:string" : "literal" } }


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

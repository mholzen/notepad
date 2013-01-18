$.notepad = $.notepad || {};
$.notepad.templates = $.notepad.templates || {};

$.notepad.templates.clusters = "CONSTRUCT { \n\
	_:filter rdfs:label   ?label1 . \n\
	_:filter rdfs:count   ?count . \n\
	_:filter sp:predicate ?p1 . \n\
	_:filter sp:object    ?o1 . \n\
 \n\
#	_:filter rdfs:label ?label2 . \n\
#	_:filter rdfs:label ?label . \n\
#	_:filter sp:predicate2 ?p2 . \n\
#	_:filter sp:object2    ?o2 . \n\
} \n\
WHERE \n\
{ \n\
	BIND (bnode() as ?filters) \n\
	{ \n\
		SELECT (count (distinct *) as ?count) ?p1 ?o1 # ?p2 ?o2 \n\
		WHERE \n\
		{ \n\
			{ \n\
				# dev:techdebt The variables neighbourForward and neighbourBackward reference  \n\
				# variables in describe.sparql \n\
 \n\
				SELECT (coalesce(?neighbourForward, ?neighbourBackward) AS ?s) \n\
				WHERE { \n\
					{{{graphPatterns}}} \n\
				} \n\
			} \n\
			?s ?p1 ?o1 FILTER( ?p1 != nmo:content ) . \n\
			?s ?p1 ?o1 FILTER( ?p1 != rdf:type ) . \n\
			# OPTIONAL { ?o1 ?p2 ?o2 } . \n\
		} \n\
		GROUP BY ?p1 ?o1 # ?p2 ?o2 \n\
 \n\
		HAVING (?count > 1) \n\
		 \n\
		ORDER BY DESC(?count) \n\
	} \n\
 \n\
	OPTIONAL { ?p1 rdfs:label ?p1Label } \n\
	LET ( ?label1 := CONCAT( ?p1Label, \" is \", str(?o1), ' (', str(?count), ')') ) \n\
 \n\
	# OPTIONAL { ?p2 rdfs:label ?p2Label } \n\
	# LET ( ?label := CONCAT('filter by ', ?label1, ' and ', ?label2)) \n\
	# LET ( ?label2 := CONCAT( COALESCE(?p2Label, ?p2), '=\"', ?o2, '\"')) \n\
} \n\
LIMIT 5 \n\
";
$.notepad.templates.coalesce = "SELECT (coalesce(?neighbourForward, ?neighbourBackward) AS ?s) \n\
WHERE { \n\
	{{{graphPatterns}}} \n\
} \n\
";
$.notepad.templates.describe = "CONSTRUCT { \n\
	?about ?predicateForward ?neighbourForward . \n\
	?neighbourBackward ?predicateBackward ?about . \n\
} \n\
WHERE { \n\
 \n\
	LET ( ?about := {{{about}}} ) \n\
 \n\
	{ ?about ?predicateForward ?neighbourForward \n\
		BIND (?neighbourForward as ?neighbour) \n\
	} \n\
	UNION \n\
	{ ?neighbourBackward ?predicateBackward ?about \n\
		BIND (?neighbourBackward as ?neighbour) \n\
		FILTER NOT EXISTS { ?neighbourBackward a notepad:Session } \n\
	} \n\
 \n\
	# Ignore  \n\
 \n\
 \n\
} \n\
";
$.notepad.templates.labels_simpler = "CONSTRUCT { \n\
	?subject a rdf:subject . \n\
	?subject rdfs:label str(?subject) . \n\
 \n\
	?predicate a rdf:predicate . \n\
	?predicate rdfs:label str(?predicate) . \n\
 \n\
	?object a rdf:object . \n\
	?object rdfs:label str(?object) . \n\
} \n\
WHERE { \n\
	{	  \n\
		?subject ?anyPredicate ?anyObject  \n\
		FILTER regex(str(?subject), \"{{{rdfs:label}}}\", \"i\") \n\
	}  \n\
	UNION \n\
	{	 \n\
		?anySubject ?predicate ?anyObject \n\
		FILTER regex(str(?predicate), \"{{{rdfs:label}}}\", \"i\") \n\
	} \n\
	UNION \n\
	{ \n\
	    ?anySubject ?anyPredicate ?object \n\
	    FILTER regex(?label, \"{{{rdfs:label}}}\", \"i\") \n\
 \n\
	    # We could add that ?anyPredicate subPropertyOf rdfs:label \n\
	} \n\
} \n\
LIMIT 30";
$.notepad.templates.labels = "CONSTRUCT { \n\
	?subject ?labelPredicate ?label \n\
} \n\
WHERE { \n\
	{	  \n\
		?subject ?predicate ?object  \n\
		FILTER regex(str(?subject), \"{{{rdfs:label}}}\", \"i\") \n\
	    BIND (notepad:subject as ?labelPredicate) # using rdf:subject instead of notepad:subject causes a bug in Jena/Fuseki \n\
	    BIND (str(?subject) as ?label)  \n\
	}  \n\
	UNION \n\
	{	 \n\
		?anySubject ?predicate ?object \n\
		FILTER regex(str(?predicate), \"{{{rdfs:label}}}\", \"i\") \n\
	    BIND (str(?predicate) as ?label)  \n\
		BIND (?predicate as ?subject) \n\
	    BIND (notepad:predicate as ?labelPredicate)  \n\
	} \n\
	UNION \n\
	{ \n\
	    ?subject ?predicate ?object	     \n\
	    BIND (str(?object) as ?label) \n\
	    FILTER regex(?label, \"{{{rdfs:label}}}\", \"i\") \n\
	    BIND (?predicate as ?labelPredicate) \n\
 \n\
	    # We could add that ?predicate subPropertyOf rdfs:label \n\
	} \n\
} \n\
LIMIT 30";
$.notepad.templates.templates = "CONSTRUCT { \n\
	?uri notepad:template ?uriTemplate . \n\
 	?uri notepad:template ?classTemplate . \n\
} \n\
WHERE \n\
{ \n\
	{ \n\
		?uri notepad:template ?uriTemplate \n\
			FILTER sameTerm(?uri, {{{uri}}}) \n\
	} \n\
	UNION \n\
	{ \n\
		?class notepad:template ?classTemplate . \n\
		?uri a ?class \n\
			FILTER sameTerm(?uri, {{{uri}}}) \n\
	} \n\
}";
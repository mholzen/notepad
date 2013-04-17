$.notepad = $.notepad || {};
$.notepad.templates = $.notepad.templates || {};

$.notepad.templates.all_labels = "CONSTRUCT { \n\
	?subject ?labelPredicate ?label . \n\
} \n\
WHERE { \n\
    ?subject ?labelPredicate ?label \n\
    FILTER ( \n\
    	isLiteral(?label) && \n\
    	?labelPredicate NOT IN (nmo:htmlMessageContent, nmo:plainTextMessageContent, nmo:content) \n\
    ) \n\
} \n\
LIMIT 200";
$.notepad.templates.c_paths_by_words = "CONSTRUCT {  \n\
    ?subject rdfs:label ?reason . \n\
	?subject ?predicate ?object  .  \n\
#    ?subject   ?labelPredicate ?word1  . \n\
#    ?predicate ?labelPredicate ?word2  . \n\
#    ?object    ?labelPredicate ?word3  . \n\
}  \n\
WHERE {  \n\
	{  \n\
	    ?subject   ?predicate ?object   FILTER ( regex(?object, \"{{{word2}}}\", \"i\")) . \n\
	    ?subject   rdfs:label ?word1 	FILTER ( regex(?word1, \"{{{word1}}}\", \"i\"))  . \n\
	    BIND	   (?word1 + \"...\" + ?word2 as ?reason) . \n\
	} \n\
	UNION \n\
	{  \n\
	    ?subject   ?predicate ?object . \n\
	    ?subject   rdfs:label ?word1 	FILTER ( regex(?word1, \"{{{word1}}}\", \"i\"))  . \n\
	    ?object    rdfs:label ?word2 	FILTER ( regex(?word2, \"{{{word2}}}\", \"i\")) . \n\
	    BIND	   (?word1 + \"...\" + ?word2 as ?reason) . \n\
	} \n\
	UNION \n\
	{  \n\
	    ?subject   ?predicate ?object . \n\
	    ?subject   rdfs:label ?word1 	FILTER ( regex(?word1, \"{{{word1}}}\", \"i\"))  . \n\
	    ?predicate rdfs:label ?word2 	FILTER ( regex(?word2, \"{{{word2}}}\", \"i\")) . \n\
	    BIND	   (?word1 + \"...\" + ?word2 as ?reason) . \n\
	} \n\
	UNION \n\
	{ \n\
	    ?subject   ?predicate ?object   FILTER ( regex(?object, \"{{{word3}}}\", \"i\")) . \n\
	    ?subject   rdfs:label ?word1 	FILTER ( regex(?word1, \"{{{word1}}}\", \"i\"))  . \n\
	    ?predicate rdfs:label ?word2 	FILTER ( regex(?word2, \"{{{word2}}}\", \"i\")) . \n\
	    BIND	   (?word1 + \"...\" + ?word2 + \"...\" + ?object  as ?reason ). \n\
	} \n\
}  \n\
LIMIT 30";
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
$.notepad.templates.datasets = "CONSTRUCT { ?dataset a notepad:Dataset } \n\
WHERE {  \n\
	GRAPH ?dataset { ?session a notepad:Session } \n\
} \n\
";
$.notepad.templates.describe_predicate = "CONSTRUCT { \n\
	{{{about}}} ?p ?o . \n\
} \n\
WHERE { \n\
	{{{about}}} ?p ?o . \n\
	# query:cache \n\
}";
$.notepad.templates.describe_with_sessions = "CONSTRUCT { \n\
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
	} \n\
} \n\
";
$.notepad.templates.describe = "CONSTRUCT { \n\
	?about ?predicateForward ?neighbourForward . \n\
	?neighbourBackward ?predicateBackward ?about . \n\
#	?neighbourForward rdfs:label ?label1 . \n\
#	?neighbourBackward rdfs:label ?label2 . \n\
} \n\
WHERE { \n\
 \n\
	LET ( ?about := {{{about}}} ) \n\
 \n\
	{ ?about ?predicateForward ?neighbourForward . \n\
#		OPTIONAL { ?neighbourForward rdfs:label ?label1 } \n\
		BIND (?neighbourForward as ?neighbour) \n\
	} \n\
	UNION \n\
	{ ?neighbourBackward ?predicateBackward ?about . \n\
#		OPTIONAL { ?neighbourBackward rdfs:label ?label2 } \n\
		BIND (?neighbourBackward as ?neighbour) \n\
		FILTER NOT EXISTS { ?neighbourBackward a notepad:Session } \n\
	} \n\
 \n\
} \n\
";
$.notepad.templates.find_predicate_label_by_label = "CONSTRUCT { \n\
	?predicate rdfs:label ?label . \n\
	?predicate notepad:inverseLabel ?inverseLabel . \n\
} \n\
WHERE { \n\
	{ ?anySubject ?predicate ?object } \n\
	UNION \n\
	{ ?predicate a rdf:Property } \n\
 \n\
	OPTIONAL { ?predicate rdfs:label 		   ?label 	     FILTER regex(?label, \"{{{rdfs:label}}}\", \"i\") } . \n\
	OPTIONAL { ?predicate notepad:inverseLabel ?inverseLabel FILTER regex(?inverseLabel, \"{{{rdfs:label}}}\", \"i\") } . \n\
 \n\
	# optional { ?predicate owl:inverseOf [ rdfs:label ?inverseLabel ] } . \n\
} \n\
";
$.notepad.templates.find_subject_label_by_label = "CONSTRUCT { \n\
	?subject ?labelPredicate ?label ; \n\
			 notepad:reason ?reason . \n\
} \n\
WHERE { \n\
    ?subject ?labelPredicate ?label \n\
    FILTER ( \n\
    	isLiteral(?label) && \n\
    	?labelPredicate NOT IN (nmo:htmlMessageContent, nmo:plainTextMessageContent) && \n\
    	regex(?label, \"{{{term}}}\", \"i\") \n\
    ) \n\
    BIND (substr(?label, 0, 100) as ?reason) \n\
} \n\
LIMIT 30";
$.notepad.templates.find_uri_literal_matching_pattern = "CONSTRUCT { \n\
	?subject a rdf:subject . \n\
	?subject rdfs:label ?label . \n\
 \n\
	?predicate a rdf:predicate . \n\
	?predicate rdfs:label ?label . \n\
 \n\
	?object a rdf:object . \n\
	?object rdfs:label ?label . \n\
} \n\
WHERE { \n\
	{	  \n\
		?subject ?anyPredicate ?anyObject  \n\
			FILTER regex(str(?subject), \"{{{rdfs:label}}}\", \"i\") \n\
			BIND (str(?subject) as ?label) \n\
	}  \n\
	UNION \n\
	{	 \n\
		?anySubject ?predicate ?anyObject \n\
			FILTER regex(str(?predicate), \"{{{rdfs:label}}}\", \"i\") \n\
			BIND (str(?predicate) as ?label) \n\
	} \n\
	UNION \n\
	{ \n\
	    ?anySubject ?anyPredicate ?object \n\
		    FILTER regex(str(?object), \"{{{rdfs:label}}}\", \"i\") \n\
		    BIND (str(?object) as ?label) \n\
 \n\
	    # We could add that ?anyPredicate subPropertyOf rdfs:label \n\
	} \n\
} \n\
LIMIT 30";
$.notepad.templates.s_subject_label_by_label = "SELECT DISTINCT ?subject ?label (substr(?label, 0, 100) as ?reason) \n\
WHERE { \n\
    ?subject ?labelPredicate ?label \n\
    FILTER ( \n\
    	regex(?label, \"{{{label}}}\", \"i\") \n\
    	&& \n\
    	?labelPredicate NOT IN (nmo:htmlMessageContent, nmo:plainTextMessageContent) \n\
    ) \n\
} \n\
ORDER BY strlen(?label) \n\
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
} \n\
# query:cache \n\
";
$.notepad.templates.triples = "CONSTRUCT { \n\
	{{{subject}}} \n\
	{{^subject}} \n\
  		?subject \n\
	{{/subject}} \n\
 \n\
	{{{predicate}}} \n\
	{{^predicate}} \n\
  		?predicate \n\
	{{/predicate}} \n\
 \n\
	{{{object}}} \n\
	{{^object}} \n\
  		?object \n\
	{{/object}} \n\
} \n\
WHERE { \n\
	{{{subject}}} \n\
	{{^subject}} \n\
  		?subject \n\
	{{/subject}} \n\
 \n\
	{{{predicate}}} \n\
	{{^predicate}} \n\
  		?predicate \n\
	{{/predicate}} \n\
 \n\
	{{{object}}} \n\
	{{^object}} \n\
  		?object \n\
	{{/object}} \n\
} \n\
";
$.notepad = $.notepad || {};
$.notepad.templates = $.notepad.templates || {};

$.notepad.templates.all_datasets = "CONSTRUCT { \n\
	?dataset a sd:Dataset ; \n\
		rdfs:label ?label . \n\
} \n\
WHERE { \n\
	GRAPH ?dataset { ?s ?p ?o } \n\
	BIND (str(?dataset) as ?label) \n\
}";
$.notepad.templates.all_labels = "CONSTRUCT { \n\
	?subject rdfs:label ?label . \n\
} \n\
WHERE { \n\
    ?subject rdfs:label ?label \n\
    FILTER (isLiteral(?label)) \n\
} \n\
LIMIT 200";
$.notepad.templates.all_predicates = "CONSTRUCT { \n\
	?predicate rdfs:label ?label . \n\
} \n\
WHERE { \n\
	?s ?predicate ?o . \n\
	?predicate rdfs:label ?label . \n\
}";
$.notepad.templates.all_sessions = "CONSTRUCT { \n\
	?session a inst:Session . \n\
	?session ?p ?o . \n\
} \n\
WHERE { \n\
	?session ?p ?o . \n\
    { ?session a <http://www.vonholzen.org/instruct/notepad/#Session> } \n\
    UNION \n\
	{ ?session a inst:Session }												# current \n\
	UNION { \n\
		?session dc:creator ?notepad 											# future \n\
			FILTER ( ?notepad IN ( \n\
	  			<http://localhost:8080/notepad>, \n\
	  			<http://instruct.vonholzen.org/notepad> ) ) \n\
  	} \n\
} \n\
LIMIT 200";
$.notepad.templates.all_workspaces = "CONSTRUCT { \n\
	?dataset a inst:Workspace . \n\
	?dataset dc:created ?time . \n\
	?dataset dc:creator ?user . \n\
	?dataset rdfs:label ?label . \n\
} \n\
WHERE { \n\
	GRAPH ?dataset { \n\
		?session a inst:Session . \n\
		OPTIONAL { ?session dc:creator ?user } \n\
		OPTIONAL { ?session dc:created ?time } \n\
 \n\
		bind( \n\
			concat (\"A workspace\", \n\
				coalesce( \n\
					concat( \", created by \", ?user, \", on \", ?time), \n\
					concat( \", created by \", ?user), \n\
					concat( \", created on \", ?time), \n\
					\"\" \n\
				) \n\
			) as ?label \n\
		) \n\
	} \n\
}";
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
$.notepad.templates.delete_sessions = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n\
PREFIX notepad: <http://www.vonholzen.org/instruct/notepad/#> \n\
 \n\
DELETE { graph ?g { ?session ?p ?o } } \n\
INSERT { graph <trash> { ?session ?p ?o } } \n\
WHERE { \n\
	graph ?g { \n\
		?session ?p ?o . \n\
		?session a <http://www.vonholzen.org/instruct/notepad/#Session> \n\
	} \n\
}";
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
		# OPTIONAL { ?neighbourForward rdfs:label ?label1 } \n\
		BIND (?neighbourForward as ?neighbour) \n\
 \n\
		# Ignore 'a inst:Session' \n\
		# FILTER NOT ( \n\
		#	sameTerm(?predicateForward, a) AND sameTerm(?neighbourForward, inst:Session) \n\
		# ) \n\
	} \n\
	UNION \n\
	{ ?neighbourBackward ?predicateBackward ?about . \n\
		# OPTIONAL { ?neighbourBackward rdfs:label ?label2 } \n\
		BIND (?neighbourBackward as ?neighbour) \n\
 \n\
		# Ignore the sessions that this URI is a member of \n\
		FILTER NOT EXISTS { \n\
			{ ?neighbourBackward a <http://www.vonholzen.org/instruct/notepad/#Session> }		# past \n\
			UNION \n\
			{ ?neighbourBackward a inst:Session }												# current \n\
			UNION { \n\
				?neighbourBackward dc:creator ?notepad 											# future \n\
					FILTER ( ?notepad IN ( \n\
			  			<http://localhost:8080/notepad>, \n\
			  			<http://instruct.vonholzen.org/notepad> ) ) \n\
		  	} \n\
		} \n\
	} \n\
 \n\
} \n\
";
$.notepad.templates.find_predicate_label_by_label = "CONSTRUCT { \n\
	?predicate rdfs:label ?label . \n\
	?predicate inst:inverseLabel ?inverseLabel . \n\
} \n\
WHERE { \n\
	{ ?anySubject ?predicate ?object } \n\
	UNION \n\
	{ ?predicate a rdf:Property } \n\
 \n\
	OPTIONAL { ?predicate rdfs:label 		?label 			FILTER regex(?label, \"{{{rdfs:label}}}\", \"i\") } . \n\
	OPTIONAL { ?predicate inst:inverseLabel	?inverseLabel	FILTER regex(?inverseLabel, \"{{{rdfs:label}}}\", \"i\") } . \n\
 \n\
	# optional { ?predicate owl:inverseOf [ rdfs:label ?inverseLabel ] } . \n\
} \n\
";
$.notepad.templates.find_subject_label_by_label = "CONSTRUCT { \n\
	?subject ?labelPredicate ?label ; \n\
			 inst:reason ?reason . \n\
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
$.notepad.templates.labeled_graph = "CONSTRUCT { \n\
	?note1 rdfs:label ?label1 . \n\
	?note2 rdfs:label ?label2 . \n\
	?note1 ?predicate ?note2 . \n\
} \n\
WHERE { \n\
    ?note1 rdfs:label ?label1 \n\
    	FILTER (isLiteral(?label1)) . \n\
 \n\
	?note1 ?predicate ?note2 . \n\
 \n\
    ?note2 rdfs:label ?label2 \n\
    	FILTER (isLiteral(?label2)) . \n\
} \n\
LIMIT 600 \n\
";
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
$.notepad.templates.test_select = "select ?start \n\
WHERE { \n\
	?start rdfs:label ?label . \n\
 \n\
	# rdfs:member behaves differently than another predicate (rdfs:member2) for example \n\
	?start rdfs:member ?end . \n\
 \n\
	# ?start ?p ?end FILTER (?p = rdfs:member) . \n\
}";
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
$.notepad.templates.workspaces_by_user = "CONSTRUCT { \n\
	?workspace a inst:Workspace . \n\
	?workspace dc:created ?time . \n\
} \n\
WHERE {  \n\
	GRAPH ?workspace { \n\
		?session a inst:Session . \n\
		?session dc:creator {{{user}}} . \n\
		OPTIONAL { ?session dc:created ?time } . \n\
	} \n\
} \n\
";
(function($) {

    // TODO: move somewhere general (req: figure out JS dependencies)
    String.prototype.contains = function(text) {
        return (this.indexOf(text)!=-1);
    };

    $.notepad = $.notepad || {};

    // var DEFAULT_SPARQL = "CONSTRUCT { ?s ?p ?o } WHERE { { ?s ?p ?o FILTER sameTerm(?s, {{{about}}} ) } UNION { ?s ?p ?o FILTER sameTerm(?o, {{{about}}} ) } }",  // an alternative is (?s=about or ?o=about)

    // var Query = function(element, sparql, endpoint) {
    //     var endpoint = endpoint || ( element.getEndpoint ? element.getEndpoint() : undefined );
    //     var sparql = sparql || DEFAULT_SPARQL;
    //     var about = new Resource(element.attr('about'));
    //     var parameters = {about: about.toSparqlString()};
    //     var sparql = Mustache.render(value, parameters);
    //     endpoint.execute(sparql, callback);
    // };

    $.notepad.queryFromObject = function(element) {
        var endpoint = element.findEndpoint();
        var uri = element.data('object') ? element.data('object').getUri() : element.attr('about');
        return function(callback) {
            endpoint.describe(uri, callback);
        }
    }
    $.notepad.queryFromContainer = function(container) {
        return function(callback) {
            var clusterTriples = $.notepad.cluster(container.triples());
            callback(clusterTriples);
        }
    }
    $.notepad.query = function(element) {
        var container = element.data('container');
        if (container) {
            return $.notepad.queryFromContainer(container);
        }
        if (element.attr('about')) {
            return $.notepad.queryFromObject(element);
        }
        throw "cannot determine the type of query to create for element"+element;
    }


FusekiEndpoint = function(uri) {
    this.uri = uri;
    this.graph = 'default';
}

FusekiEndpoint.prototype = {
    prefixes: function() {
        var prefixes = "";
        for (var prefix in $.notepad.DEFAULT_NAMESPACES) {
            prefixes += "PREFIX " + prefix + ": <" + $.notepad.DEFAULT_NAMESPACES[prefix] + ">\n";
        }
        return prefixes;
    },
    updateUri: function() {
        return this.uri + "/update";
    },
    queryUri: function() {
        return this.uri + "/query";
        //return this.uri + "Inferred" + "/query";
    },
    query: function(command, callback) {
        var options = { query: command, output:'json'};
        if (this.graph != 'default') {
            options['default-graph-uri'] = this.graph;
        }
        return $.getJSON(this.queryUri(), options, callback);
    },
    update: function(command, callback) {
        return $.post(this.updateUri(), {update: command}, function() {
            // There is a delay before the updates are available in the query server.
            // So we force the client to wait for this delay here.
            setTimeout(callback, 100);
        });

        // ALTERNATIVE: use a query parameter to set the default graph, instead of a GRAPH patter.  Could not get FUSEKI to work with it.
        // return $.post(this.uri+'/update', {update: command, 'using-named-graph-uri':this.graph}, callback);
    },
    queryReturningGraph: function(command, callback) {
        return this.query(command, function(graph) {
            var triples = new Triples(0);
            for(s in graph) {
                for(p in graph[s]) {
                    for(i in graph[s][p]) {
                        triples.push(new Triple(s,p,graph[s][p][i].value));
                    }
                }
            }
            callback(triples);
        });
    },
    execute: function(command, callback) {
        command = this.prefixes() +
            "PREFIX : <" + $.uri.base() + '#> \n' +
            command;
        if (command.toLowerCase().contains('construct') || command.toLowerCase().contains('describe')) {
            return this.queryReturningGraph(command, callback);
        } else if (command.toLowerCase().contains('select') ) {
            return this.query(command, callback);
        } else {
            return this.update(command, callback);
        }
    },
    clear: function(callback) {
        return this.update('DELETE { ?s ?p ?o } WHERE { ?s ?p ?o }',callback);
    },
    post: function(triples, callback) {
        // Not yet implemented
    },
    getSubjectsLabelsByLabel: function(label, callback) {
        // rdfs:subPropertyOf is reflexive (ie. "?x rdfs:subPropertyOf ?x ." is true)
        // However, even though it is reflexive, I am adding the UNION clause below to ensure that rdfs:label is returned, even when we run against a triplestore without rules
        var command = 
        'SELECT DISTINCT ?subject ?label \
        WHERE {  \
            ?subject ?labelPredicate ?label FILTER regex(?label, "'+label.replace(/"/g, '\\"')+'", "i") \
        }';
        // { ?labelPredicate rdfs:subPropertyOf rdfs:label } UNION { ?subject rdfs:label ?label } 
        this.execute(command,function(data) { 
            var subjectsLabels = _.map(data.results.bindings, function(binding) {
                var subject = new Resource(binding.subject);
                return { label: binding.label.value, value: subject.toString() };
            });
            callback(subjectsLabels);
        });
    },
    getPredicatesLabelsByLabel: function(label, callback, knownSet) {
        var command = '\
            SELECT DISTINCT ?pred ?label \
            WHERE { \
                ?pred rdfs:label ?label FILTER regex(?label, "'+label+'", "i") \
                { ?s ?pred ?o } UNION { ?pred a rdf:Property } \
            }';
        this.execute(command,function(data) { 
            var results = $.map(data.results.bindings, function(element,index) {
                var uri = new Resource(element.pred.value).toString();
                return { label: element.label.value, value: uri };
            });
            results = _.uniq(results,knownSet);
            callback(results);
        });
    },
    getRdf: function(uri, callback) {
        this.getRdfBySubject(uri,callback);
        //this.describe(uri,callback);
    },
    getRdfBySubject: function(subject, callback) {
        var s = new Resource(subject)
        var command = 'SELECT ?s ?p ?o WHERE { '+s.resource.toString() +' ?p ?o }';
        this.execute(command,function(data) { 
            var triples = _.map(data.results.bindings, function(binding) {
                return new Triple(subject, binding.p, binding.o);
            });
            callback(triples);
        });
    },
    getRdfBySubjectObject: function(uri, callback) {
        var r = new Resource(uri)
        var command = 'SELECT ?s ?p ?o WHERE { ' +
                '{ '+r.resource.toString() +' ?p ?o } UNION ' + 
                '{ ?s ?p '+r.resource.toString() +' } ' +
            '}';
        this.execute(command, function(data) { 
            var triples = $.map(data.results.bindings, function(element,index) {
                var subject = element.s || {value: uri};
                var object = element.o || {value: uri};
                return new Triple(subject.value, element.p.value, object.value );
            });
            callback(triples);
        });
    },
    describe: function(uri, callback) {
        if (uri === undefined) {
            throw new Error("cannot describe without a URI");
        }
        var about = new Resource(uri);
        if (about.isBlank()) {
            throw "cannot describe a blank node " + uri;
        }
        var command = "CONSTRUCT { ?s ?p ?o } WHERE { { ?s ?p ?o FILTER sameTerm(?s, {{{about}}} ) } UNION { ?s ?p ?o FILTER sameTerm(?o, {{{about}}} ) } }";
        var sparql = Mustache.render(command, {about: about.toSparqlString()});
        this.execute(sparql, callback);
    },
    getLabels: function(subject, callback, knownLabels) {
        var labels = _.clone(knownLabels) || [];
        var subjectResource = new Resource(subject);
        var command = 'SELECT DISTINCT ?label WHERE { '+ subjectResource.toSparqlString() +' rdfs:label ?label }';
        this.execute(command,function(data) {
            _.each(data.results.bindings, function(binding) {
                labels.push(binding.label.value);
            });
            labels = _.uniq(labels);
            callback(labels);
        });
    },
    insertData: function(triples, callback) {
        var sparql = '{' + triples.update().join('\n') + '}';
        if ( this.graph != 'default') {
            sparql = '{ GRAPH <' + this.graph + '>' + sparql + '}';
        }
        sparql = 'INSERT DATA ' + sparql;
        this.execute(sparql,callback);
    },
    constructAll: function(callback) {
        var sparql = '{ ?s ?p ?o }';
        sparql = 'CONSTRUCT { ?s ?p ?o } WHERE ' + sparql;
        this.execute(sparql, callback);
    },

}

})(jQuery);
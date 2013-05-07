(function($) {

$.notepad = $.notepad || {};
$.notepad.core = toResource('notepad:core');

cache = {};

FusekiEndpoint = function(uri, graph) {
    this.uri = uri;
    if (graph === 'new') {
        graph = $.notepad.newUri();
    }
    this.graph = graph || 'default';
}

TempFusekiEndpoint = function(triples, callback) {
    var endpoint = new FusekiEndpoint("http://localhost:3030/test");
    endpoint.graph = $.notepad.newUri();
    this.endpoint = endpoint;
    endpoint.insertData( triples, callback.bind(this) );
}

FusekiEndpoint.prototype = {
    toString: function() {
        var value = "Fuseki SPARQL at " + this.uri;
        if (this.graph != 'default') {
            value += " and graph " + this.graph;
        }
        return value;
    },
    prefixes: function() {
        var prefixes = "";
        for (var prefix in $.notepad.namespaces) {
            prefixes += "PREFIX " + prefix + ": <" + $.notepad.namespaces[prefix] + ">\n";
        }
        return prefixes;
    },
    updateUri: function() {
        return this.uri + "/update";
    },
    queryUri: function() {
        return this.uri + "/query";
        // This doesn't seem to work anymore because the inferred model is not re-bound when the base model changes.  Also deleted triples don't disappear from the inf model.
        //return this.uri + "Inferred" + "/query";
    },
    query: function(command, callback) {
        var options = { query: command, output:'json' };

        if (this.graph != 'default') {
            options['default-graph-uri'] = [ 
                this.graph.toURL(),
                $.notepad.core.toURL()
            ];
        }

        if (command.match(/# query:cache/)) {
            if (command in cache) {
                console.debug("returning cached results");
                callback ( cache[command] );
                return $.Deferred().resolve();
            } else {
                var previousCallback = callback;
                callback = function(result) {
                    cache[command] = result;
                    previousCallback(result);
                }
            }
        }
        var finalCallback;
        if (callback) {
            finalCallback = function(response, status, xhr) {
                var type = xhr.getResponseHeader("Content-Type");
                if (type.contains('application/rdf+json')) {
                    var databank = $.rdf.databank();
                    databank.load(response);
                    callback($.notepad.toTriples(databank));
                } else {
                    callback(response);
                }    
            }
        }
        return $.ajax({url: this.queryUri(), dataType: "json", data: options, traditional: true, success: finalCallback});
    },
    update: function(command, callback) {
        console.log('[endpoint]', 'update', 'POST', {command:command});

        return $.post(this.updateUri(), {update: command}, function() {
            // There is a delay before the updates are available in the query server.
            // So we force the client to wait for this delay here.

            console.log('[endpoint]', 'update', 'completed', {command:command});
            setTimeout(callback, 100);
        });

        // ALTERNATIVE: use a query parameter to set the default graph, instead of a GRAPH patter.  Could not get FUSEKI to work with it.
        // return $.post(this.uri+'/update', {update: command, 'using-named-graph-uri':this.graph}, callback);
    },
    queryReturningGraph: function(command, callback) {
        return this.query(command, function(graph) {
            var triples = new Triples();
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
    execute: function(sparql, callback) {
        var isRead = sparql.match(/^\s*(construct|describe|ask|select)/i);
        var sparql = this.prefixes() + sparql;
        if (isRead) {
            return this.query(sparql, callback);
        } else {
            return this.update(sparql, callback);
        }
    },
    _graphSparqlPattern: function(sparql) {
        if (this.graph && this.graph !== 'default') {
            sparql = '{ GRAPH ' + toResource(this.graph).toSparqlString() + ' ' + sparql + '}';
        }
        return sparql;
    },
    clear: function(callback) {
        var pattern = this._graphSparqlPattern ( '{ ?s ?p ?o }' );
        return this.update('DELETE '+pattern+' WHERE '+pattern, callback);
    },
    post: function(triples, callback) {
        // Not yet implemented
    },
    getSubjectsLabelsByLabel: function(label, callback) {
        var nbsp = String.fromCharCode(160);
        label = label.replace(nbsp, ' ').replace(/"/g, '\\"');

        var query = new Query($.notepad.templates.s_subject_label_by_label);
        query.execute(this, {label: label}, function(data) { 
            var subjectsLabels = _.map(data.results.bindings, function(binding) {
                var subject = new Resource(binding.subject);
                return { label: binding.reason.value, value: subject.toString() };
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
    _insertSparql: function(triples) {
        if (!triples || triples.length === 0) {
            return '';
        }
        return 'INSERT DATA ' + this._graphSparqlPattern ( '{' + triples.update().toSparqlString() + '}' );
    },
    insertData: function(triples, callback) {
        return this.execute(this._insertSparql(triples),callback);
    },
    _deleteSparql: function(triples) {
        if (!triples || triples.length === 0) {
            return '';
        }
        return 'DELETE DATA ' + this._graphSparqlPattern ( '{' + triples.update().toSparqlString() + '}' );
    },
    deleteData: function(triples, callback) {
        return this.execute(this._deleteSparql(triples),callback);
    },
    deleteInsertData: function(deleted,inserted,callback) {
        var sparql = this._deleteSparql(deleted) + this._insertSparql(inserted);
        return this.execute(sparql,callback);  
    },
    constructAll: function(callback) {
        var sparql = '{ ?s ?p ?o }';
        sparql = 'CONSTRUCT { ?s ?p ?o } WHERE ' + sparql;
        this.execute(sparql, callback);
    },
    canAnswer: function(callback) {
        return this.query("ask {?s ?p ?o}", callback);
    }
}

    $.notepad.test = new FusekiEndpoint("http://localhost:3030/test");
    $.notepad.dev = new FusekiEndpoint("http://localhost:3030/dev");
    $.notepad.prod = new FusekiEndpoint("http://instruct.vonholzen.org:3030/dev");
$.notepad.defaultEndpoint = new FusekiEndpoint('http://' + $.uri.base().authority.replace(/:(.*)$/, '') + ':3030/dev');
$.notepad.defaultEndpoints = [
    $.notepad.defaultEndpoint,
    'http://instruct.vonholzen.org:3030/dev'
];

})(jQuery);
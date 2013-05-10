(function($) {

$.notepad = $.notepad || {};

var cache = {};

FusekiEndpoint = function(url, graph) {
    this.url = url;
    this.graph = graph || 'default';
}

FusekiEndpoint.prototype = {
    toString: function() {
        return "Fuseki SPARQL at " + this.url;
    },
    prefixes: function() {
        var prefixes = "";
        for (var prefix in $.notepad.namespaces) {
            prefixes += "PREFIX " + prefix + ": <" + $.notepad.namespaces[prefix] + ">\n";
        }
        return prefixes;
    },
    updateUrl: function() {
        return this.url + "/update";
    },
    queryUrl: function() {
        return this.url + "/query";
        // This doesn't seem to work anymore because the inferred model is not re-bound when the base model changes.  Also deleted triples don't disappear from the inf model.
        //return this.url + "Inferred" + "/query";
    },

    _defaultGraphUriParams: function() {
        if (this.graph === 'default' || !this.graph) {
            return undefined;
        }
        return [
            toResource(this.graph).toURL(),
            toResource(':core').toURL()
        ];
    },

    query: function(command, callback) {
        var options = { query: command, output:'json' };

        options['default-graph-uri'] = this._defaultGraphUriParams();

        console.debug('[endpoint]', 'query', {query:command});

        if (command.match(/# query:cache/)) {
            if (command in cache) {
                console.log('[query]', '[cache]', 'return cache hit');
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
        return $.ajax({url: this.queryUrl(), dataType: "json", data: options, traditional: true})
        .then(function(response, status, xhr) {
            var type = xhr.getResponseHeader("Content-Type");
            if (type.contains('application/rdf+json')) {
                var databank = $.rdf.databank();
                databank.load(response);
                response = $.notepad.toTriples(databank);
            }
            console.debug('[endpoint]', 'query response', response);
            if (callback) {
                callback(response);
            }
            return response;
        });
    },
    _graphSparqlPattern: function(sparql) {
        if (this.graph && this.graph !== 'default') {
            sparql = '{ GRAPH ' + toResource(this.graph).toSparqlString() + ' ' + sparql + '}';
        }
        return sparql;
    },
    _addGraph: function(command) {
        var endpoint = this;
        command = command.replace(/INSERT ({.*?})/g, function(match, pattern) {
            return 'INSERT ' + endpoint._graphSparqlPattern(pattern);
        });
        command = command.replace(/DELETE ({.*?})/g, function(match, pattern) {
            return 'DELETE ' + endpoint._graphSparqlPattern(pattern);
        });
        command = command.replace(/WHERE ({.*?})/g, function(match, pattern) {
            return 'WHERE ' + endpoint._graphSparqlPattern(pattern);
        });
        return command;
    },
    update: function(command, callback) {
        command = this._addGraph(command);
        console.log('[endpoint]', 'update', 'POST', {update:command});
        return $.post(this.updateUrl(), {update: command, 'using-graph-uri': this._defaultGraphUriParams() }, function() {
            // There is a delay before the updates are available in the query server.
            // So we force the client to wait for this delay here.

            console.log('[endpoint]', 'update', 'completed', {command:command});
            setTimeout(callback, 100);
        });
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
        if (!sparql || sparql.length === 0) {
            return new $.Deferred().resolveWith();
        }
        var isRead = sparql.match(/^\s*(construct|describe|ask|select)/i);
        var sparql = this.prefixes() + sparql;
        if (isRead) {
            return this.query(sparql, callback);
        } else {
            return this.update(sparql, callback);
        }
    },
    clear: function(callback) {
        return this.update('DELETE { ?s ?p ?o } WHERE { ?s ?p ?o }', callback);
    },
    post: function(triples, callback) {
        // Not yet implemented
    },
    workspaces: function(user, callback) {
        var query = $.notepad.queries.workspaces_by_user;
        var endpointDefaultDataset = new FusekiEndpoint(this.url);
        return query.execute(endpointDefaultDataset, {user: user}, callback);
    },
    selectWorkspace: function(user, callback) {
        return this.workspaces(user, function(workspaces) {
            if (workspaces.length === 0) {
                this.graph = $.notepad.newUri();
            } else {
                this.graph = workspaces[0].subject;
            }
            callback(this.graph);
        });
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
    // should: refactor using a query
    constructAll: function(callback) {
        var sparql = '{ ?s ?p ?o }';
        sparql = 'CONSTRUCT { ?s ?p ?o } WHERE ' + sparql;
        return this.execute(sparql, callback);
    },
    canAnswer: function(callback) {
        return this.query("ask {?s ?p ?o}", callback);
    }
}

TempFusekiEndpoint = function(triples, callback) {
    var endpoint = new FusekiEndpoint("http://localhost:3030/test", $.notepad.newUri());
    if ( callback ) {
        callback = callback.bind(endpoint);
    }
    return endpoint.insertData( triples, callback );
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
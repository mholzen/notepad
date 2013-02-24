(function($, undefined) {

    $.notepad = $.notepad || {};

    Query = function(sparql, context) {
        this.sparqlTemplate = sparql;           // default to describe?
        this.context = context || {};
    };
    Query.prototype = {
        toSparql: function(context) {
            var ctx = this.context;
            $.extend(ctx, context);
            return Mustache.render(Mustache.render(Mustache.render(this.sparqlTemplate, ctx), ctx), ctx);  // TODO: HAHAHAHA
        },
        where: function() {
            return this.sparqlTemplate.match(/WHERE\s*{\s*([\s\S]*)\s*}/i)[1];
        },
        execute: function(endpoint, context, callback) {
            var sparql = this.toSparql(context);
            endpoint.execute(sparql, callback);
        },
        appendPattern: function(pattern) {
            var insertPosition = this.sparqlTemplate.lastIndexOf('}');
            this.sparqlTemplate = this.sparqlTemplate.substring(0, insertPosition) +
                pattern + this.sparqlTemplate.substring(insertPosition);
            return this;
        },
        appendTriplePattern: function(triplePattern) {
            var subjects   = triplePattern.triples(undefined, "sp:subject");
            var predicates = triplePattern.triples(undefined, "sp:predicate");
            var objects    = triplePattern.triples(undefined, "sp:object");

            var subject   = subjects.length ? subject[0].object.toSparqlString() : "?neighbour";      // dev:debt
            var predicate = predicates.length ? predicates[0].object.toSparqlString() : "?someAnonymousVariable" ;
            var object    = objects.length ? objects[0].object.toSparqlString() : "?someOtherAnonymousVariable" ;    // dev:debt

            var sparqlPattern = "{ " + subject + " " + predicate + " " + object + "}";
            return this.appendPattern(sparqlPattern);
        }
    };
    function queryFromPredicates(predicates) {
        var whereClauses = predicates.map( function(predicate) { return '?s '+predicate+' ?o .'; });
        whereClauses.push (' && .');
        var sparql = 'CONSTRUCT {?s ?p ?o} WHERE { ?s ?p ?o FILTER( sameTerm(?s, {{{about}}}) \
            && ( ?p in (' + predicates.join(",") + ') ) ) }';
        sparql = sparql + '\n # query:cache';
        return new Query(sparql);
    }
    $.notepad.queryFromPredicates = queryFromPredicates;



    $.notepad.describeQuery = new Query($.notepad.templates.describe);
    $.notepad.coalesceQuery = new Query($.notepad.templates.coalesce, {graphPatterns: $.notepad.describeQuery.where()});
    $.notepad.clusterQuery = new Query($.notepad.templates.clusters, {graphPatterns: $.notepad.describeQuery.where()});

    $.notepad.describeObject = function(element) {
        var uri = element.attr('about');
        //var uri = element.data('notepadObject') ? element.data('notepadObject').getUri() : element.attr('about');
        var resource = new Resource(uri);
        var about = resource.toSparqlString();
        return new Query($.notepad.templates.describe, {about: about});
    }
    
    $.notepad.clusterFromTriples = function(triples) {
        var clusters = {};
        _.each(triples, function(triple) {
            clusters[triple.predicate] = clusters[triple.predicate] || {};
            clusters[triple.predicate][triple.object] = clusters[triple.predicate][triple.object] || {};
            clusters[triple.predicate][triple.object][triple.subject] = 1;
        });
        var clusterTriples = new Triples();
        for (var predicate in clusters) {
            for (var object in clusters[predicate]) {
                var clusterUri = $.notepad.getNewUri();
                clusterTriples.push(
                    new Triple(clusterUri, "rdfs:label", "filter by " + predicate + "=" + object)
                );
                for (var memberUri in clusters[predicate][object]) {
                    if (this.includeMembers) {
                        clusterTriples.push(
                            new Triple(clusterUri, "rdfs:member", memberUri)
                        );
                    }
                }
            }
        }
        // It will need to fetch more information about the URIs, so it will need an endpoint
        return clusterTriples;
    };

    $.notepad.clustersFromContainer = function(container) {
        return function(callback) {
            var clusterTriples = $.notepad.clusterFromTriples(container.triples());
            callback(clusterTriples);
        }
    }

    if ($.notepad.templates) {
        $.notepad.queries = $.notepad.queries || {};
        _.each($.notepad.templates, function(query,name) {
            $.notepad.queries[name] = new Query(query);
        });
    }

}(jQuery));

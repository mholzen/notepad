(function($, undefined) {

    $.notepad = $.notepad || {};

    Query = function(template, context) {
        this.template = template;
        this.context = context || {};
    };
    Query.prototype = {
        toSparql: function(context) {
            var ctx = this.context;
            $.extend(ctx, context);
            return Mustache.render(Mustache.render(Mustache.render(this.template, ctx), ctx), ctx);  // TODO: HAHAHAHA
        },
        where: function() {
            return this.template.match(/WHERE\s*{\s*([\s\S]*)\s*}/i)[1];
        },
        execute: function(endpoint, context, callback) {
            var sparql = this.toSparql(context);
            endpoint.execute(sparql, callback);
        },
        appendPattern: function(pattern) {
            var insertPosition = this.template.lastIndexOf('}');
            var newTemplate = this.template.substring(0, insertPosition) + pattern + this.template.substring(insertPosition);
            this.template = newTemplate;
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

    $.notepad.describeQuery = new Query($.notepad.templates.describe);
    $.notepad.coalesceQuery = new Query($.notepad.templates.coalesce, {graphPatterns: $.notepad.describeQuery.where()});
    $.notepad.clusterQuery = new Query($.notepad.templates.clusters, {graphPatterns: $.notepad.describeQuery.where()});

    $.notepad.describeObject = function(element) {
        var uri = element.data('object') ? element.data('object').getUri() : element.attr('about');
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

    $.notepad.labels = new Query($.notepad.templates.labels);

}(jQuery));

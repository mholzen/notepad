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
            return new Query(newTemplate);
        }
    };

    $.notepad.describeQuery = new Query($.notepad.templates.describe);
    $.notepad.coalesceQuery = new Query($.notepad.templates.coalesce, {graphPatterns: $.notepad.describeQuery.where()});
    $.notepad.clusterQuery = new Query($.notepad.templates.clusters, {graphPatterns: $.notepad.describeQuery.where()});
    
    $.notepad.clusterFromTriples = function(triples) {
        var clusters = {};
        _.each(triples, function(triple) {
            clusters[triple.predicate] = clusters[triple.predicate] || {};
            clusters[triple.predicate][triple.object] = clusters[triple.predicate][triple.object] || {};
            clusters[triple.predicate][triple.object][triple.subject] = 1;
        });
        var clusterTriples = new Triples(0);
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

}(jQuery));

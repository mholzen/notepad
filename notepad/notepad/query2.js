(function($, undefined) {

    $.notepad = $.notepad || {};

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

    function Query() {
    };
    Query.prototype = {
        construct: 
        execute: function(uri, callback) {
            this.endpoint.execute(this.describe(uri))
        }
    }

    $.notepad.findClustersFromQuery = function(query) {
        query.sparql()
    };

}(jQuery));

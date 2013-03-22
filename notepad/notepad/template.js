(function($, undefined) {

    javascriptConstructor = {
        'XMLLiteral': $,
    };

    $.notepad = $.notepad || {};

    graphToContext = function(triples, uri) {
        var context = {};
        _.each(triples, function(triple) {
            var value = {};
            if (uri && triple.subject.toString() != uri.toString()) {
                return;
            }

            context.subject = triple.subject;

            if (triple.object.isLiteral()) {
                // should: verify this actually works (ie. that we have .type)
                var type = triple.object.datatype() || 'xsd:string';
                value[type] = triple.object;

                // Range
                var range = triples.objects(triple.predicate, 'rdfs:range');
                if (range.length) {
                    var constructor = javascriptConstructor[range] || function(s) { return s.toString(); };
                    value[range] = constructor(triple.object);
                }

                // should: generalize based on rdfs:range
                if (triple.predicate == 'nmo:htmlMessageContent') {
                    type = 'rdf:XMLLiteral';
                }

                value["xsd:string"] = triple.object.toString();
                context[type] = triple.object;
            }
            if (triple.object.isUri()) {
                value["uri"] = triple.object.toString();
            }
            if (context[triple.predicate] === undefined) {
                context[triple.predicate] = value;
            } else {
                context[triple.predicate] = [ value, context[triple.predicate] ];
            }
        });
        return context;        
    }

    $.notepad.graphToContext = graphToContext;

    Template = function(template) {
        this.template = template;
    };
    Template.prototype = {
        predicates: function() {
            var variables = this.template.match(/{{#*[a-zA-Z:]*?}}/gm).map(function(s) {return s.replace(/[\{\}#]/g, ''); });
            return _.without(variables, 'uri', 'about');
        },
        context: function(triples) {
            return graphToContext(triples);
        },
        render: function(triples, context) {
            var context = context || {};
            context = _.extend(context, this.context(triples));
            return Mustache.render(this.template, context);
        }
    };

}(jQuery));

(function($, undefined) {

    $.notepad = $.notepad || {};

    Template = function(template) {
        this.template = template;
    };
    Template.prototype = {
        predicates: function() {
            var variables = this.template.match(/{{#*[a-zA-Z:]*?}}/gm).map(function(s) {return s.replace(/[\{\}#]/g, ''); });
            return _.without(variables, 'uri', 'about');
        },
        context: function(triples) {
            var context = {};
            _.each(triples, function(triple) {
                var value = {};
                if (triple.object.isLiteral()) {
                    value["xsd:string"] = triple.object.toString();
                    // TODO: generalize by triple.object.type;
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
        },
        render: function(triples, context) {
            var context = context || {};
            context = _.extend(context, this.context(triples));
            return Mustache.render(this.template, context);
        }
    };

}(jQuery));

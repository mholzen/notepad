(function($, undefined) {

    $.widget("notepad.xsdstring", {
        setLiteral: function(literal) {
            this.element.text(literal.toString());
        },
        text: function() {
            //return this.element.find('*').map(function(i,e) { return e.text(); }).toArray().join("\n");
            return this.element.text();
        },
        getLiteral: function() {
            var string = this.text();
            if (string.length === 0) {
                return;
            }
            return toResource(string);
        },
        _create: function() {
            this.element.autocomplete2();
            this.element.attr('contenteditable', 'true');
        },
        _destroy: function() {
            this.element.removeAttr('contenteditable');
            this.element.data('notepadAutocomplete2').destroy();
            this.element.text("");
        }
    });
    $.widget("notepad.rdfxmlliteral", {
        setLiteral: function(literal) {
            this.element.html(literal.toString());
        },
        getLiteral: function() {
            var resource = new Resource(this.element.html());
            resource.resource.datatype = 'rdf:XMLLiteral';
            return resource;
        },
        _create: function() {
        },
    });
    $.widget("notepad.xsddate", {
        setLiteral: function(literal) {
            var date = new Date(literal)
            this.element.attr('content', date.valueOf());
            this.element.text(moment(date.valueOf()).fromNow());
        },
        getLiteral: function() {
            var date = this.element.attr('content');
            if (date.length === 0) {
                return;
            }
            return new Resource(date+'^^xsd:date');
        },
        _create: function() {
            this.element.datepicker();
        },
    });

    var types = {
        'xsd:string': {
            widget: $.fn.xsdstring,
            name: 'notepadXsdstring'
        },
        'rdf:XMLLiteral': {
            widget: $.fn.rdfxmlliteral,
            name: 'notepadRdfxmlliteral'
        },
        'xsd:dateTime': {
            widget: $.fn.xsddate,
            name: 'notepadXsddate'
        },

    }

    $.widget("notepad.literal", $.notepad.object, {

        // manages a literal of a triple
        // - setLiteral(plain or typed literal)

        //  -triples()
        // - uses its predicate to determine the type

        // q: does it have a template?

        // q: how does it interact with label and urilabel?

        // Set up the widget
        _create: function() {
            this._super();
            if ( ! this.value().length ) {
                this.element.wrapInner('<div class="value">');
            }
            this.option('type', 'xsd:string');
        },

        value: function() {
            return this.element.children('.value');
        },

        _destroy : function() {
            this.literal()._destroy();
            this.value().remove();
        },

        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'type':
                    var type = types[value.toString()] || types['xsd:string'];
                    type.widget.apply(this.value());
                    this.options.name = type.name;
                break;
            }
        },

        literal: function() {
            return this.value().data(this.options.name);
        },

        getLiteral: function() {
            return this.literal().getLiteral();
        },

        _setLiteral: function(literal) {
            if (typeof literal === "string") {
                if (literal.length === 0) {
                    return;
                }
                literal = new Resource(literal);
            }
            this.option('type', literal.datatype());
            this.literal().setLiteral(literal);
        },

        setLiteral: function(literal) {
            // Set Literal using predicate ranges
            var self = this;

            // var endpoint = this.element.findEndpoint();
            // if (!endpoint) {
            //     // this doesn't return a promise.  should it?
            //     return self._setLiteral(literal);
            // }

            return $.notepad.queries.describe_predicate.execute(this.element.findEndpoint(), {predicate: this.getPredicateUri().toSparqlString()}, function(triples) {
                // filter could be added to the query instead of filtered here
                var ranges = triples.objects(undefined, 'rdfs:range');

                if (ranges.length === 0) {
                    return self._setLiteral(literal);
                }

                literal = new Resource(literal);
                literal.resource.datatype = ranges[0];
                self._setLiteral(literal);
            });

        },

    });

}(jQuery));

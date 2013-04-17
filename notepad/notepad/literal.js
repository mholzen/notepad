(function($, undefined) {

    $.widget("notepad.literal", $.notepad.object, {

        options: {
            query: 'describe_predicate',
            ranges: null,
        },
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
        _query: function() {
            if ( typeof this.options.query === 'string' ) {
                return $.notepad.queries[this.options.query];
            }
            return this.options.query;
        },


        literal: function() {
            return this.value().data(this.options.name);
        },

        getLiteral: function() {
            return this.literal().getLiteral();
        },

        _setLiteral: function(literal, ranges) {
            if (typeof literal === 'string' && literal.length === 0) {
                return;
            }
            if ( !(literal instanceof Resource) ) {
                literal = new Resource(literal);
            }
            var datatype = ( ranges ) ?
                ranges.objects(this.getPredicateUri(), 'rdfs:range') : 
                literal.datatype();
            
            this.option('type', datatype);
            this.literal().setLiteral(literal, datatype);
        },

        _context: function() {
            return { predicate: this.getPredicateUri() };
        },

        setLiteral: function(literal) {
            var endpoint = this.element.findEndpoint();
            if ( endpoint ) {
                return this._query().execute(endpoint, this._context(), this._setLiteral.bind(this, literal));
            }
            return this._setLiteral(literal, this.options.ranges);

        },

        setLiteralOld: function(literal) {
            // Set Literal using predicate ranges
            var self = this;

            // var endpoint = this.element.findEndpoint();
            // if (!endpoint) {
            //     // this doesn't return a promise.  should it?
            //     return self._setLiteral(literal);
            // }

            return $.notepad.queries.describe_predicate.execute(this.element.findEndpoint(), this._context(), function(triples) {
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

    $.widget("notepad.sparql", {
        setLiteral: function(literal) {
            this.element.text(literal);
        },
        getLiteral: function() {
            return toLiteral(this.element.text()+'^^notepad:sparql');
        },
        query: function() {
            return new Query(this.getLiteral(), {}, "this.subject() rdfs:label");
        },
        _create: function() {
            debugger;
            // this should replace (or create) a container that will receive the results of the execution of this sparql
            $('#query').container({query: this.query()});
        },
    });

    var notepadSparql = toTriples(
        toTriple('notepad:sparql', 'rdfs:label', "Sparql"),
        toTriple('notepad:sparql', 'rdfs:range', "notepad:sparql")
    );

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
        'notepad:sparql': {
            widget: $.fn.sparql,
            name: 'notepadSparql'
        },

    }

}(jQuery));

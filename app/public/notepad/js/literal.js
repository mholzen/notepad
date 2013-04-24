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

        _datatype: function(value) {
            if (value === null) {
                this.element.removeAttr('datatype');
            } else if ( value !== undefined ) {
                this.element.attr('datatype', value);
            }
            return this.element.attr('datatype');
        },

        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'type':
                    var datatype = this._datatype(value);
                    var widget = widgetsByDatatype[datatype] || widgetsByDatatype['xsd:string'];
                    widget.init.apply(this.value());
                    this.options.name = widget.name;
                break;
            }
        },
        _query: function() {
            if ( typeof this.options.query === 'string' ) {
                return $.notepad.queries[this.options.query];
            }
            return this.options.query;
        },

        // consider: typedLiteral(), or datatype()
        literal: function() {
            return this.value().data(this.options.name);
        },
        datatype: function() {
            return this.literal();
        },
        discoverDatatype: function() {
            var endpoint = this.element.findEndpoint();
            if ( !endpoint ) {
                return new $.Deferred().resolveWith();
            }
            var literal = this;
            return this._query().execute(endpoint, this._context(), function(ranges) {
                var datatype = ranges.objects(literal.getPredicateUri(), 'rdfs:range');
                literal.option('type', datatype);
            });
        },

        getLiteral: function() {
            return this.literal().getLiteral();
        },

        _context: function() {
            return { about: this.getPredicateUri() };
        },
        setLiteral: function(value) {
            value = toLiteral(value);
            if ( value.datatype() ) {
                this.option('type', value.datatype());
                return this.datatype().setLiteral(value);
            }
            var literal = this;
            return this.discoverDatatype().done( function() {
                literal.datatype().setLiteral(value);
            });
        },

    });

    function discoverPredicate(text) {
        // Should ignore a colon in double, or single quotes
        var parts = text.match(/\s*(.*?\S):\s*(.*)/);
        if (!parts) {
            return;
        }
        var predicate = parts[1].trim();
        var remainder = parts[2].trim();

        if ($.notepad.knownScheme(predicate) ) {
            // Ignore URIs
            // consider: ignore CURIES?
            return;
        }
        return {predicate: predicate, remainder: remainder};
    }
    $.notepad.discoverPredicate = discoverPredicate;


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
            return toLiteral(string);
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
            var date = new Date(literal.toString())
            this.element.attr('content', date.valueOf());
            this.element.text(moment(date.valueOf()).fromNow());
        },
        getLiteral: function() {
            var date = this.element.attr('content');
            if (date.length === 0) {
                return;
            }
            return toLiteral(date, 'xsd:dateTime');
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
            return toLiteral(this.element.text(), 'notepad:sparql');
        },
        query: function() {
            return new Query(this.getLiteral().toString(), {}, "<from a literal; could search rdfs:label of the uri>");
        },
        _meta: function() {
            return toTriples(
                toTriple('javascript:line.executeSparql()', 'rdfs:label', "Execute SPARQL query..."),
                toTriple('javascript:line.toggleSparql()', 'rdfs:label', "Show/hide query")
                );
        },
        _create: function() {
            this.element.meta();
            this.element.data('notepadMeta').add(this._meta.bind(this));
        },
    });

    // should: translate to RDF
    var widgetsByDatatype = {
        'xsd:string': {
            init: $.fn.xsdstring,
            name: 'notepadXsdstring'
        },
        'rdf:XMLLiteral': {
            init: $.fn.rdfxmlliteral,
            name: 'notepadRdfxmlliteral'
        },
        'xsd:dateTime': {
            init: $.fn.xsddate,
            name: 'notepadXsddate'
        },
        'notepad:sparql': {
            init: $.fn.sparql,
            name: 'notepadSparql'
        },

    };

}(jQuery));

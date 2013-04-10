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
            if ( ! this.literal() ) {
                // the literal might have been destroyed, 
                // and this method is being called after an ajax finally query returns
                return;
            }
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

    };


    // consider: using the line widget with {objectWidget: readonly-label, predicateWidget: readonly-forward-label}
    $.widget("notepad.reverseLine", {
        _line: function() {
            return this.element.closest(':notepad-line').data('notepadLine');
        },
        _subject: function() {
            return $("<div>")
                .attr('about', this._line().getUri())
                .endpoint({endpoint: this.element.findEndpoint()})
                .urilabel();
        },
        _predicate: function() {

            // should be:
            // (this._line().options.forwardLabel)({edit: false, about: uri})

            var template = this._line().getDirection() === 'forward' ?
                '{{#notepad:inverseLabel}}<div class="notepad-literal notepad-predicate" rel="notepad:inverseLabel">{{xsd:string}}</div>{{/notepad:inverseLabel}}' :
                '{{#rdfs:label}}<div class="notepad-literal notepad-predicate" rel="rdfs:label">{{xsd:string}}</div>{{/rdfs:label}}' ;

            return $('<div class="notepad-predicate-label">')
                .attr('about', this._line().getContainerPredicateUri())
                .endpoint({endpoint: this.element.findEndpoint()})
                .urilabel({template: template});
        },
        _object: function() {
            return $('<span>')
                .attr('about', this._line().getContainerUri())
                .endpoint({endpoint: this.element.findEndpoint()})
                .urilabel();
        },

        _list: function() {
            return this._line()
                ? this._subject().append( $("<ul>").append(this._predicate(), this._object()) ) 
                : undefined;
        },

        _create: function() {
            // consider: send triples to a "read only urilabel" widget
            this.element.append(this._list());
        }
    });

}(jQuery));

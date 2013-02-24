(function($, undefined) {

    var types = {
        'xsd:string': {
            widget: $.notepad.autocomplete2,
            setLiteral: function(literal) { this.element.text(escape(literal)); },
            getLiteral: function() { return this.element.text(); },
        },
        'xsd:date': {
            widget: $.fn.datepicker,
            setLiteral: function(literal) { this.element.text(literal); },      // could use get/setDate
            getLiteral: function() { return this.element.text(); },
        },
        'XMLLiteral': {
            setLiteral: function(literal) { this.element.html(literal); },
            getLiteral: function() { return this.element.html(); },
        },
    };

    // when I set a literal to a literal of a different type, what should happen?

    $.widget("notepad.literal", $.notepad.object, {

        // manages a literal of a triple
        // - setLiteral(plain or typed literal)

        //  -triples()
        // - uses its predicate to determine the type

        // q: does it have a template?

        // q: how does it interact with label and urilabel?


        options: { 
            template: 
                '{{#xsd:date}}' +
                    '<div class="uiDatepicker literal">{{xsd:date}}</div>' +
                '{{/xsd:date}}' +
                '{{#rdf:XMLLiteral}}' +
                    '<div class="literal">{{{rdf:XMLLiteral}}}</div>' +
                '{{/rdf:XMLLiteral}}' +
                '{{^rdf:XMLLiteral}}' +
                    '<div class="notepadAutocomplete literal" contenteditable="true">{{xsd:string}}</div>' +
                '{{/rdf:XMLLiteral}}' +
                '',

            dynamicTemplate:    true,
        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'template':
                    this.template = value;
                break;
            }
        },

        _createTemplateElement: function() {
            return $('<div class="notepad-template">').appendTo(this.element);
        },
        getTemplateElement: function() {
            var el = this.element.children(".notepad-template");
            if (el.length > 0) {
                return el;
            }
            return this._createTemplateElement();
        },
        getLiteral: function() {
            var text = this.getTemplateElement().find('.literal').text() || $(this.element).text();
            return (text.length !== 0) ? new Resource(text) : undefined;
        },
        setLiteralWithoutRange: function(literal) {
            var type = literal.datatype();
            var widgetname = types[type].widgetname;
            var widget = this.element.data(widgetname);

            if (!widget) {
                // remove 
            }

            if (widget) {
                this.element.widget();
            }
            widget.setLiteral(literal);
        },

        setLiteral: function(literal) {
            // Set Literal using predicate ranges
            var label = this;
            this.element.findEndpoint().describe(this.getPredicateUri(), function(triples) {

                // filter could be added to the query instead of filtered here
                triples = triples.triples(undefined, 'rdfs:range', undefined);

                triples.add(label.triple(literal));

                label.update(triples);
            });

        },

        update: function(triples) {
            var template = new Template(this.options.template);
            var html = template.render(triples);

            this.getTemplateElement().empty();
            this.getTemplateElement().append(html);

            // Apply any widget constructors to this.getTemplateElement()
            // autocomplete

            // Should autocomplete get applied on
            // a) every text literal?  or 
            //      setting literal causes destroy() and create() of a new widget
            // b) when focus is given to text literal?
            this.getTemplateElement().find(".notepadAutocomplete").autocomplete2();

            this.getTemplateElement().find(".uiDatepicker").datepicker();
        },

        // Set up the widget
        _create: function() {
            this._super();
            this.setLiteral(this.getLiteral());
        },
        _destroy : function() {
        },

    });

}(jQuery));

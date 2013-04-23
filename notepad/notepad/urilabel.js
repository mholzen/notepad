(function($, undefined) {

    var defaultTemplates = new Triples();
    defaultTemplates.add(toTriple('notepad:urilabel', 'notepad:template', '{{#rdfs:label}}<div class="notepad-literal notepad-predicate" rel="rdfs:label">{{xsd:string}}</div>{{/rdfs:label}}'));
    defaultTemplates.add(toTriple('notepad:urilabel', 'rdfs:label', 'Label'));
    defaultTemplates.add(toTriple('notepad:uri', 'notepad:template', '<div class="uri">{{subject}}</div>' ));
    defaultTemplates.add(toTriple('notepad:uri', 'rdfs:label', 'URI'));

    $.widget("notepad.urilabel", {

        // differentiate between a) new URI with no label, suggesting one and b) edit a remote URL

        // Manages a URI and its representation
        // Can be used to represent a subject, a predicate or a URI object (not a literal object)

        options: { 
            template: '' +
                '{{#rdfs:label}}' +
                    '<div class="notepad-literal notepad-predicate" rel="rdfs:label">{{xsd:string}}</div>' +
                '{{/rdfs:label}}' +
                '{{^rdfs:label}}' +
                    '<div class="notepad-literal notepad-predicate" rel="rdfs:label"></div>' +
                '{{/rdfs:label}}' +
                '<span class="notepad-external-link"/>' +
                '',
                                
            urichange:          $.noop,

            // should: use literal, to: use autocomplete2 on literal
            autocomplete:       true,
            allowBlankNodes:    true,
            dynamicTemplate:    true,
        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'uriElement':
                    if (value) {
                        this.uriChanged();
                    }
                    break;
                case 'template':
                    // When changing the template, we leave it up to the caller to know when to reload
                break;
            }
        },

        getEndpoint: function () {
            return this.element.findEndpoint();
        },
        getNotepad: function() {
            return this.element.parents('.notepad').data("notepadNotepad");
        },

        getUri: function() {
            var attr = this.element.attr('about');
            if (!attr) {
                return undefined;
            }
            return toResource(attr);
        },
        setUri: function(uri, triples) {
            if (uri === undefined) {
                throw new Error("cannot set uri to undefined");
            }
            // Do not ignore if the URI is the same, as the template might have changed
            this._setUri(uri);
            if ( triples ) {
                this.update(triples)
            } else {
                this.uriChanged();    
            }
            this._trigger("urichange"); // adds widget prefix.
        },
        _setUri: function(uri) {
            if (this.getUri() && this.getNotepad()) {
                // This might have to go in the public function, if there is a need to set a URI and delete the associated triples
                this.getNotepad().unloaded(this.triples());
            }
            this.element.attr('about', uri);
            return this;
        },

        setLabel: function(literal) {
            var triples = new Triples();
            if (literal) {
                literal = toLiteral(literal);
                triples.add(toTriple(this.getUri(), "rdfs:label", literal));
            }
            return this.update(triples);
        },
        getLabel: function() {
            var triples = this.triples();
            if (triples.length === 0) {
                return;
            }
            return triples.object(undefined, "rdfs:label");
        },
        newUri: function(uri) {
            var uri = uri || $.notepad.newUri();
            this._setUri(uri);
        },
        ensureUri: function() {
            if (this.getUri() !== undefined) { return this.getUri(); }
            this.newUri();
        },

        _createTemplateElement: function() {
            return $('<div class="notepad-template">').prependTo(this.element);
        },
        getTemplateElement: function() {
            var el = this.element.children(".notepad-template");
            if (el.length > 0) {
                return el;
            }
            return this._createTemplateElement();
        },
        getLabelElement: function() {
            return this.getTemplateElement().find('[contenteditable="true"]');
        },

        templateQuery: function() {
            var query = $.notepad.queries.templates;
            query.context = {uri: this.getUri()};  // consider merge
            return query;
        },
        templates: function(callback) {
            if (!callback) {
                return defaultTemplates;
            }
            return this.templateQuery().execute(this.element.findEndpoint(), undefined, callback);
        },

        // refactor: using above
        uriChanged: function(callback) {
            if ( this.getEndpoint() === undefined ) {
                return;
            }
            if ( this.getUri().isBlank() ) {
                return;
            }
            var label = this;
            if (this.options.dynamicTemplate) {
                // consider: this.templates( this.templateReceived.bind(this) );
                this.templates( function(templateTriples) {
                    label.templateReceived(templateTriples, callback);
                });
            } else {
                this.load(callback);
            }
        },
        templateReceived: function(templateTriples, callback) {
            var templateStrings = templateTriples.triples(this.getUri(), "notepad:template", undefined).objects();
            var templateString;
            if (templateStrings.length === 0) {
                templateString = this.options.template;
            } else {
                templateString = templateStrings[0].toString();
            }

            this.options.template = templateString;     // for use in update
            this.load();
        },
        load: function(callback) {
            if (this.getEndpoint() === undefined) {
                return;
            }

            var label = this;
            var template = new Template(this.options.template);
            var dataQuery = this.options.query || $.notepad.queryFromPredicates(template.predicates());
            dataQuery.execute(this.getEndpoint(), {about: this.getUri()}, function(dataTriples) {
                label.dataReceived(dataTriples, callback);
            });
        },
        dataReceived: function(triples, callback) {
            this.update(triples);

            if (this.getNotepad()) {
                this.getNotepad().loaded(this.triples());
            }
            if (callback !== undefined) {
                callback.apply(this);
            }    
        },

        update: function(triples) {
            var context = {};
            if (this.getUri()) {
                context['about'] = this.getUri();
            }
            var html = new Template(this.options.template).render(triples, context, this.getUri());

            this.getTemplateElement().empty();
            this.getTemplateElement().append(html);

            // Apply any widget constructors
            this.getTemplateElement().find(".notepad-urilabel").urilabel({dynamicTemplate: true});

            this.getTemplateElement().find(".notepad-predicate").predicate({label: null});

            this.getTemplateElement().find(".notepad-literal").literal();

            if ($.fn.reverseLine) {
                this.getTemplateElement().find(".notepad-reverse-line").reverseLine();
            }

            if ($.fn.externalLink) {
                this.getTemplateElement().find(".notepad-external-link").externalLink();
            }

            this.getTemplateElement().tooltip({items: ".tooltip > .item", content: function() {
                return $(this).siblings('.content').html();
            }});

            return this;
        },

        triples: function() {
            // Triples fetched by the label
            var uri = this.getUri();
            if (!uri) {
                return [];
            }
            var triples = new Triples();
            // this.getTemplateElement().children(":notepad-object").each(function(i,e) {
            //     triples.add($(e).data('notepadObject').triples());
            // });

            this.getTemplateElement().find(":notepad-literal").each(function(i,e) {
                var literal = $(e).data('notepadLiteral');
                var triple = literal.triple();
                triples.add(triple);
            });

            return triples;
        },

        // Set up the widget
        _create: function() {
            var literal;
            if (this.element.data('notepadLiteral')) {
                literal = this.element.data('notepadLiteral').getLiteral();
                this.element.data('notepadLiteral').destroy()
            } else if (this.element.text().length > 0) {
                literal = this.element.text();
                this.element.text('');
            }

            if (this.getUri()) {
                this.uriChanged();
            } else {
                this.newUri();
                this.setLabel(literal);
            }
            var urilabel = this;

            // consider: when the user clears out the content, give it a new URI
            //      should: handle situation
            // this.element.on('keyup', '[contenteditable="true"]', function(event) {
            //     if ( urilabel.getLabel() === undefined ) {
            //         debugger;
            //         urilabel.newUri();
            //     }
            // });
        },
        _destroy : function() {
            this.element.removeAttr('about');
            this.element.empty();
        },

    });

}(jQuery));

(function($, undefined) {

    $.widget("notepad.urilabel", {

        // Manages a URI and its representation
        // Can be used to represent a subject, a predicate or a URI object (not a literal object)

        options: { 
            template: '' +
                        '{{#rdfs:label}}' +
                            '<div contenteditable="true" rel="rdfs:label">{{xsd:string}}</div>' +
                        '{{/rdfs:label}}' +
                        '',
                                
            urichange:          $.noop,
            autocomplete:       true,
            allowBlankNodes:    true,
            dynamicTemplate:    false,
            autocompleteSource: function(request,callback) {
                var urilabel = this.element.closest(':notepad-urilabel').data('notepadUrilabel');
                urilabel.getEndpoint().getSubjectsLabelsByLabel(request.term.trim(),callback);
            },
            autocompleteSelect: function(event, ui) {
                var uri = ui.item.value;
                var label = ui.item.label;
                var urilabel = $(event.target).closest(':notepad-urilabel').data('notepadUrilabel');
                urilabel.set(toTriple(uri, "rdfs:label", label));
                event.preventDefault();  // prevent the default behaviour of replacing the text with the value.  _updateRdf has taken care of it
            },

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
                    // What should be the behaviour here?
                    // If changing the template triggers a load(), then ... we issue a request with a possibly changing URI
                    //this.uriChanged();
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
            return this.element.attr('about');
        },
        getUriSparql: function() {
            return new Resource(this.getUri()).toSparqlString();
        },
        setUri: function(uri) {
            if (uri === undefined) {
                throw new Error("cannot set uri to undefined");
            }
            if (uri == this.getUri()) {
                return;
            }
            this._setUri(uri);
            this.uriChanged();
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
        set: function(triple) {
            this._setUri(triple.subject);
            this.update(toTriples(triple));
            this._trigger("urichange");
        },

        newUri: function(uri, label) {
            uri = uri || $.notepad.getNewUri();
            label = label || "related to";
            this.set(toTriple(uri, "rdfs:label", label));
            this._trigger("urichange");
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
        getLabelElement: function() {
            return this.getTemplateElement().find('[contenteditable="true"]');
        },

        uriChanged: function(callback) {
            if (this.getEndpoint() === undefined) {
                return;
            }
            var label = this;
            if (this.options.dynamicTemplate) {
                console.debug("query for label template");
                var templateQuery = new Query($.notepad.templates.templates);
                templateQuery.execute(this.getEndpoint(), {uri: this.getUriSparql()}, function(templateTriples) {
                    label.templateReceived(templateTriples, callback);
                });
            } else {
                var template = new Template(this.options.template);
                var dataQuery = $.notepad.queryFromPredicates(template.predicates());
                console.debug("query for data");
                dataQuery.execute(this.getEndpoint(), {about: this.getUriSparql()}, function(dataTriples) {
                    label.dataReceived(dataTriples, callback);
                });
            }
        },
        templateReceived: function(templateTriples, callback) {
            console.debug("template received");
            var templateStrings = templateTriples.triples(this.getUri(), "notepad:template", undefined).objects();
            var templateString;
            if (templateStrings.length === 0) {
                templateString = this.options.template;
            } else {
                templateString = templateStrings[0].toString();
            }

            var label = this;
            this.options.template = templateString;     // for use in update
            var template = new Template(templateString);
            var dataQuery = $.notepad.queryFromPredicates(template.predicates());
            console.debug("query for data");
            dataQuery.execute(this.getEndpoint(), {about: this.getUriSparql()}, function(dataTriples) {
                label.dataReceived(dataTriples, callback);
            });
        },
        dataReceived: function(triples, callback) {
            console.debug("data received");
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
            var html = new Template(this.options.template).render(triples, context);

            this.getTemplateElement().empty();
            this.getTemplateElement().append(html);

            // Apply any widget constructors
            this.getTemplateElement().find(".notepad-urilabel").urilabel({dynamicTemplate: true});

            // this.getTemplateElement().tooltip({items: ".tooltip", content: function() {
            //     var element = $( this );
            //     return element.attr('alt');
            // }});

            this.getTemplateElement().tooltip({items: ".tooltip > .item", content: function() {
                console.log($(this).siblings('.content'));
                return $(this).siblings('.content').html();
            }});

            // This could be done via widget constructors as wel
            this._setupAutocomplete();
        },

        triples: function() {
            // Triples fetched by the label
            var uri = this.getUri();
            if (!uri) {
                return [];
            }

            var triples = new Triples();
            this.getTemplateElement().children(".notepad-label").each(function(i,e) {
                triples.add($(e).data('notepad-label').labelTriples());
            });

            this.getTemplateElement().find("[rel]").filter(':visible').each(function(i,e) {
                var object;

                if ($(e).attr('about')) {
                    object = $(e).attr('about');
                } else {
                    object = $(e).text();
                }
                if (object.length === 0) {
                    return;
                }
                triples.add(new Triple(uri, $(e).attr('rel'), object) );
            });
            return triples;
        },

        _setupAutocomplete: function() {
            if (!this.options.autocomplete) {
                return;
            }
            var label = this;
            this.getLabelElement().autocomplete({
                source: label.options.autocompleteSource,
                select: label.options.autocompleteSelect,
            });
        },

        // Set up the widget
        _create: function() {
            if (this.getUri()) {
                this.uriChanged();
            } else {
                this.update();
            }

            this._setupAutocomplete();
        },
        _destroy : function() {
            this.getLabelElement().autocomplete('destroy');
        },

    });

}(jQuery));

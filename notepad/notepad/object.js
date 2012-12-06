(function($, undefined) {

    $.widget("notepad.object", {

        // See notepad.js for interface

        options: { 
            template: '<div>{{{rdfs:label}}}{{^rdfs:label}}<span contenteditable="false" class="uri">{{{uri}}}</span>{{/rdfs:label}}</div>',
            // template: '<div>{{{rdfs:label}}}</div>',
        },
        _setOption: function(key, value) {
            this._super(key, value);
        },

        getNotepad: function() {
            return this.element.parents('.notepad').data("notepad");
        },
        getParent: function() {
            return this.element.parents(".notepad-container").data("container") || this.getNotepad();
        },

        getEndpoint: function () {
            return this.element.findEndpoint();
        },

        getLine: function() {
            return this.element.parent('.notepad-line').data('notepad-line');
        },
        template: function() {
            // The object should be responsible for determining the best way to display itself, given its context

            if (this.getParent() && this.getParent().lineTemplate) {
                return this.getParent().lineTemplate;
            }

            return this.options.template;
        },

        getPredicate: function() {
            return this.options.predicate || this.element.closest(":notepad-predicate").data('predicate');
        },
        getPredicateUri: function() {
            var predicate = this.getPredicate();
            return predicate ? predicate.getUri() : undefined;
        },
        getSubjectUri: function() {
            var predicate = this.getPredicate();
            return predicate ? predicate.getSubjectUri() : undefined;
        },


        // Object or Literal

        // Object Uri
        isLiteral: function() {
            return (this.getObjectUri() === undefined && this.getObjectLiteral().length > 0);
        },
        isUri: function() {
            return (this.getObjectUri() !== undefined);
        },
        isDefined: function() {
            return this.isLiteral() || this.isUri();
        },
        getUri: function() {
            return this.element.attr("about");
        },
        getObjectUri: function() {
            return this.getUri();
        },
        _setObjectUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setObjectUri: function(uri) {
            this._setObjectUri(uri);

            this.load();
        },
        getObjectLiteral: function() {
            return this.element.text();
        },
        setObjectLiteral: function(literal) {
            this.element.text(literal);
        },
        setObject: function(resource) {
            if (resource.isLiteral()) {
                return this.setObjectLiteral(resource);
            } else if (resource.isUri()) {
                return this.setObjectUri(resource);
            }
            throw new Error("cannot set an object that is neither a literal or a URI");
        },
        getResource: function() {
            if (this.isLiteral()) {
                return this.getObjectLiteral();
            } else if ( this.isUri() ) {
                return this.getObjectUri();
            }
            return undefined;
        },
        label: function() {
            return this.element.text();
        },
        predicatesInTemplate: function() {
            var variables = this.template().match(/{{[a-zA-Z:]*?}}/gm).map(function(s) {return s.replace(/[\{\}]/g, ''); });
            if (variables.indexOf('uri') != -1) {
                variables.splice(variables.indexOf('uri'), 1);      // Remove the element 'uri'
            }
            return variables;
        },

        queryFromTemplate: function(about) {
            var predicatesInTemplate = this.predicatesInTemplate();
            var whereClauses = predicatesInTemplate.map( function(predicate) { return '?s '+predicate+' ?o .'; });
            whereClauses.push (' && .');
            var query = 'CONSTRUCT {?s ?p ?o} WHERE { ?s ?p ?o FILTER( sameTerm(?s, '+about.toSparqlString()+') \
                && ( ?p in (' + predicatesInTemplate.join(",") + ') ) ) }';
            return query;
        },

        load: function() {
            // TODO: refactor with container.load
            var query = this.options.query;
            var sparql;
            var aboutResource = new Resource(this.getObjectUri());    
            if (query !== undefined) {
                sparql = Mustache.render(query, {about: aboutResource.toSparqlString()});
            } else {
                sparql = this.queryFromTemplate(aboutResource); 
            }

            var object = this;
            this.getEndpoint().execute(sparql, function(triples) {
                object._updateFromRdf(triples);

                // Trigger the event only after the object has displayed itself
                // so that: dependent DOM elements can avoid redisplaying a triple that is already displayed here
                object._trigger("urichange"); // will trigger 'objecturichange'
            });
        },
        setObjectLabel: function(label) {
            this.element.text(label);
        },
        _updateFromRdf: function(triples) {
            var predicatesInTemplate = this.predicatesInTemplate();

            var context = { uri: this.getObjectUri().toString() };

            _.each(predicatesInTemplate, function(predicate) {
                var values = triples.filter(function(triple) { return triple.predicate == predicate; });
                if (values.length != 1) {
                    log.warn("not exactly one value ("+values.length+" found) for a template substitution ("+predicate+")");
                    values[0] = { object: "" };
                }
                context[predicate] = values[0].object;
            })
            var html = Mustache.render(this.template(), context);
            this.element.html(html);
        },

        getObject: function() {
            // Does not handle literals: deprecated by notepad-label.js
            return this.getObjectUri();
        },
        triple: function() {
            var subject, predicate, object;

            if (! (subject   = this.getSubjectUri())) {
                return undefined;
            }
            if (! (predicate = this.getPredicateUri())) {
                return undefined;
            }
            if (! (object    = this.getResource())) {
                return undefined;
            }
            if (this.getPredicate().isForward()) {
                return new Triple(subject, predicate, object);
            }
            // Backward
            if (this.isUri()) {
                return new Triple(object, predicate, subject);
            }
            return undefined;
        },
        focus: function() {
            return this.element.focus();
        },

        // Set up the widget
        _create : function() {

            // Object
            this.element.addClass('notepad-object').attr('contenteditable', 'true');

            // on change, set the URI if it's not yet set
            // => new objects that are not changed do not receive a URI
            var object = this;
            this.element.change(function(event) {
                if (object.getObjectUri() === undefined) {
                    object._setObjectUri($.notepad.getNewUri());
                }
            });

            var notepad = this.getNotepad();
            this.element.autocomplete({
                source: function(term,callback) {
                    notepad.getSubjectsLabelsByLabel(term.term,callback);
                },
                select: function(event, ui) {
                    var object = $(event.target).closest('.notepad-object').data('object');
                    object.setObjectUri(ui.item.value);
                    object.setObjectLabel(ui.item.label);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
                });
        },
        _destroy : function() {
            this.element.removeClass("notepad-object").removeAttr('contenteditable');
            this.element.autocomplete('destroy');
        },

    });

}(jQuery));

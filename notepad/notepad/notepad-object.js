(function($, undefined) {

    $.widget("notepad.object", {

        // See notepad.js for interface

        options: { 
            template: '<div>{{{rdfs:label}}}  {{^rdfs:label}}<span contenteditable="false" class="uri">{{{uri}}}</span>{{/rdfs:label}} </div>',

//            template: '<div>{{{rdfs:label}}}</div>',
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

        setSubject: function(subject) {
            this.subject = subject;
            return this;
        },
        getSubject: function() {
            return this.subject;
        },
        getSubjectUri: function() {
            if (this.subject === undefined) {
                throw new Error("no subject defined");
            }
            if (this.subject.getUri) {
                // subject is a widget
                return this.subject.getUri();
            }
            if (this.subject.attr['about']) {
                return this.subject.attr['about'];
            }
            throw new Error("cannot determine subject's uri");
        },

        setPredicate: function(predicate) {
            this.predicate = predicate;
            return this;
        },
        getPredicateUri: function() {
            if (this.predicate === undefined) {
                throw new Error("no predicate defined");
            }
            if (this.predicate.getUri) {
                // predicate is a widget
                return this.predicate.getUri();
            }
            if (this.predicate.attr['rel']) {
                return this.predicate.attr['rel'];
            }
            throw new Error("cannot determine predicate's uri");
        },

        // Object or Literal

        // Object Uri
        isLiteral: function() {
            return (this.getObjectUri() === undefined && this.getObjectLiteral().length > 0);
        },
        isUri: function() {
            return (this.getObjectUri() !== undefined);
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
        value: function() {
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
            // TODO: handle literals, somehow, I think
            return this.getObjectUri();
        },
        getTriple: function() {
            return new Triple(this.getSubjectUri(), this.getPredicateUri(), this.getObject());
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

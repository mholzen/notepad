// See README.txt

(function($, undefined) {

    var DEFAULT_ENDPOINT = new Triples(
        new Triple('rdf:Property', 'rdfs:label', 'property'),
        new Triple('rdfs:member', 'rdfs:label', 'member')
    );

    $.widget("notepad.notepad", {
        options: {
            endpoint: DEFAULT_ENDPOINT
        },
        _setOption: function(key, value) {
            switch(key) {
                case 'endpoint':
                this.element.endpoint({endpoint: value});
                break;
            }
            this._super(key, value);        // We have jquery-ui 1.9
        },

        getUri: function() {
            return this.element.attr('about');
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
        },
        setUri: function(uri) {
            this._setUri(uri);
            
            // Setting the URI should update the line representation and any children
            var container = this.getContainer();
            this.getRdf(uri, function(triples) {
                container._updateFromRdf(triples);
            });
        },

        getContainer: function() {
            return this.element.children('ul').data('container');
        },
        getLines: function() {
            return this.getContainer().getLines();
        },

        // Set up the notepad
        _create : function() {
            var self = this;

            this.element.addClass("notepad");
            this.option('endpoint', this.options.endpoint);

            this._setUri($.notepad.getNewUri());

            var ul = $('<ul>').appendTo(this.element).container();  // Create an empty container
            this.getContainer().appendLine();  // Start with one empty line
            
            this.element.on("keydown.notepad", function(event) {
                if($(event.target).data('autocomplete') && $(event.target).data('autocomplete').menu.active) {
                    // The autocomplete menu is active, do nothing here
                    return;
                }

                var keyCode = $.ui.keyCode;
                switch (event.keyCode) {
                case keyCode.ENTER:
                case keyCode.NUMPAD_ENTER:
                    return self._return(event);
                    break;
                case keyCode.UP:
                    return self._up(event);
                    break;
                case keyCode.DOWN:
                    return self._down(event);
                    break;
                case keyCode.TAB:
                    if (!event.shiftKey) {
                        self._indent(event);
                    } else {
                        self._unindent(event);
                    }
                    return false;
                    break;
                default:
                    break;
                }
            });

            // notepad:created rdfs:subPropertyOf dc:created
            var created = $('<span property="notepad:created" content="'+Date.now()+'">').appendTo('h2');
            created.attr('about', $.notepad.uri() + '#' + this.getUri().slice(1));
            setInterval(function() {
                $("[property='notepad:created']").each(function(i,e) {
                    $(e).text("Created " + moment(parseInt($(e).attr('content'))).fromNow());
                });
            }, 1000);

        },
        _destroy : function() {
            this.element.removeClass("notepad").removeAttr('about').unbind();
            this.element.children().remove();
        },
        _up : function(event) {
            var target = $(event.target);
            var li = target.closest(':notepad-line');
            if (li.length === 0) {
                return;
            }

            // Get the list of lines
            var lines = li.data('line').getNotepad().getContainer().getAllLineElements();
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i>0) {
                $(lines[i-1]).data('line').focus();
            }
            return false;   // Prevent default behaviour
        },
        _down : function(event) {
            var target = $(event.target);
            var li = target.closest(':notepad-line');
            if (li.length === 0) {
                return false;
            }

            // Get the list of lines
            var lines = li.data('line').getNotepad().getContainer().getAllLineElements();
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i<lines.length-1) {
                $(lines[i+1]).data('line').focus();
            }
            return false;   // Prevent default behaviour
        },
        _return : function(event) {
            var target = $(event.target);
            var li = target.closest(":notepad-line");
            if (li.length === 0) {
                return false;
            }
            var caret = target.caret();
            
            var line = li.data('line');
            if (caret == 0) {
                line.insertLineBefore();
                // Stay focused on the current line, that moved down
            } else {
                var newLine = line.insertLineAfter();

                var text = line.getLineLiteral();
                line.setLineLiteral( text.substring(0,caret) );
                newLine.setLineLiteral( text.substring(caret) );
                newLine.focus();
            }
            
            return false;
        },
        _indent : function(event) {
            var li = $(event.target).closest(":notepad-line");

            // when on the predicate, then skip to the object
            if ($(event.target).hasClass('notepad-predicate')) {
                li.find('.notepad-object:first').focus();
                return false;
            }

            var line = li.data('line');
            var propagateEvent = line.indent();
            line.focus();
            return propagateEvent;
        },
        _unindent : function(event) {
            var li = $(event.target).closest(":notepad-line");

            if ($(event.target).hasClass('notepad-object') &&
                li.find('.notepad-predicate').css('display') != 'none') {
                li.find('.notepad-predicate').focus();
                return false;
            }
            var line = li.data('line');
            var propagateEvent = line.unindent();
            line.focus();
            return propagateEvent;
        },

        // TODO: this really should be expressed in RDF
        defaultPredicates: [
            {
                uri: 'rdf:Property',
                labels: ['property']
            },
            {
                uri: 'rdfs:member',
                labels: ['member']
            }
        ],
        defaultPredicateLabelsByUri: {
            'rdf:Property': ['property'],
            'rdfs:member':  ['member']
        },

        getEndpoint: function() {
            return this.option('endpoint');
        },
        getRdf: function(uri, callback) {
            return this.getEndpoint().getRdf(uri,callback);
        },
        getRdfBySubject: function(uri, callback) {
            this.getEndpoint().getRdfBySubject(uri, callback);
        },
        getRdfBySubjectObject: function(uri, callback) {
            this.getEndpoint().getRdfBySubjectObject(uri, callback);
        },
        getSubjectsLabelsByLabel: function(label, callback) {
            return this.getEndpoint().getSubjectsLabelsByLabel(label, callback);
        },   

        _getNotepadPredicateLabels: function(uri) {
            var labels = _.clone(this.defaultPredicateLabelsByUri[uri] || []);

            var elementsWithPredicate = this.element.find('[rel="'+uri+'"]');
            _.each(elementsWithPredicate, function(element) {
                var label = $(element).val();
                if ( label.length > 0) {
                    labels.push( label );
                }
            });
            return _.uniq(labels);
        },
        getLabels: function(uri, callback) {
            // get labels from notepad-triples-endpoint
            // get labels from notepad-endpoint
            // merge
            var notepadPredicateLabels = this._getNotepadPredicateLabels(uri);
            if (this.getEndpoint() === undefined) {
                return callback(notepadPredicateLabels);
            }
            this.getEndpoint().getLabels(uri, callback, notepadPredicateLabels);
            return notepadPredicateLabels;
        },

        _getNotepadPredicatesLabelsByLabel: function(wantedLabel) {
            var results = [];
            _.each( this.defaultPredicates, function(predicate) {
                _.each( predicate.labels, function(label) {
                    if (label == wantedLabel) {
                        results.push ( {label: label, value: predicate.uri} );
                    }
                });
            });
            return results;
        }, 
        getPredicatesLabelsByLabel: function(label, callback) {
            var notepadPredicateLabels = this._getNotepadPredicatesLabelsByLabel(label);
            if (this.getEndpoint() === undefined) {
                return callback(notepadPredicateLabels);
            }
            this.getEndpoint().getPredicatesLabelsByLabel(label, callback, notepadPredicateLabels);
        },
        setRdf: function(triples) {
            this.getContainer()._updateFromRdf(triples);
        },
        
        triples: function(){
            var triples = new Triples();

            rdfaTriples = $.notepad.toTriples($('h2').rdf().databank);  // This shouldn't need its own code
            triples.add(rdfaTriples);

            triples.push(new Triple(this.getUri(), "rdf:type", "notepad:Session")); // ALT: use RDFAs typeof attribute instead

            $.merge(triples,this.getContainer().triples());

            return triples;
        },
        deletedTriples: function() {
            return $.grep(this.triples(), function(triple) { return triple.operation === 'delete'; });
        },
        contains: function(triple) {
            return this.triples().contains(triple);
        },
        expresses: function(triple) {
            return this.triples().expresses(triple);
        },
        loaded: function(triple) {
            if (!this._loaded) {
                this._loaded = new Triples();
            }
            if (triple !== undefined) {
                this._loaded.add(triple);
            }
            return this._loaded;
        },
        unloaded: function(triples) {
            this._loaded = this._loaded.minus(triples);
        },
        added: function() {
            return this.triples().minus( this.loaded() );
        },
        removed: function() {
            return this.loaded().minus( this.triples() );
        },
    });

}(jQuery));
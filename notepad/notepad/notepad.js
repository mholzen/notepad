(function($, undefined) {

    var defaultPredicateMap = {
        'a' : 'rdfs:Class',
        'subclass' : 'rdfs:Class',
        'more specifically' : 'rdfs:Class',
        'requires': 'rdfs:requires',
        'source' : 'rdf:source',
        'synonym' : 'owl:sameAs',
        'i.e.' : 'owl:sameAs',
        'e.g.' : 'owl:sameAs',
        'member': 'rdfs:member',
        'sequence' : 'rdf:Seq',
        'to' : 'rdfs:provide',
        'more generally' : '-rdfs:Class',
        'named' : 'rdfs:label',
        'domain' : 'rdfs:domain',
        'range' : 'rdfs:range'
    };

    $.widget("notepad.notepad", {
        // A notepad defines
        //  - a toplevel URI
        //  - a list of lines

        // TODO: this should instead be expressed in RDF as a collection of 'predicate-uri', 'rdfs:label', '<label>'
        _predicateMap : {
            'a' : 'rdfs:Class',
            'subclass' : 'rdfs:Class',
            'more specifically' : 'rdfs:Class',
            'requires': 'rdfs:requires',
            'source' : 'rdf:source',
            'synonym' : 'owl:sameAs',
            'i.e.' : 'owl:sameAs',
            'e.g.' : 'owl:sameAs',
            'member': 'rdfs:member',
            'sequence' : 'rdf:Seq',
            'to' : 'rdfs:provide',
            'more generally' : '-rdfs:Class',
            'named' : 'rdfs:label',
            'domain' : 'rdfs:domain',
            'range' : 'rdfs:range'
        },

        options : {},
        endpoint: undefined,
        
        getUri: function() {
            return this.element.attr('about');
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
        },

        getContainer: function() {
            return this.element.children('ul').data('container');  // TODO: this may throw
        },
        getLines: function() {
            return this.getContainer().getLines();
        },

        // Set up the notepad
        _create : function() {
            var self = this;

            this.element.addClass("notepad");

            this.endpoint = undefined;

            this._setUri($.fn.notepad.getNewUri());

            var ul = $('<ul>').appendTo(this.element).container();  // Create an empty container
            this.getContainer().appendLine();  // Start with one empty line
            
            this.element.on("keydown.notepad", function(event) {
                if($(event.target).data('autocomplete').menu.active) {
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
                        
        },
        _destroy : function() {
            this.element.removeClass("notepad").removeAttr('about').unbind();
            this.element.children().remove();
        },
        
        // TODO: not currently in use
        _updateObjectAutocomplete : function(line) {
            var predicate = line.children('.predicate').val();
            var object = line.children('.object');
            if (predicate === 'more generally') {
                object.autocomplete('option', 'disabled', false);
            } else {
                object.autocomplete('option', 'disabled', true);
            }
        },

        _up : function(event) {
            var target = $(event.target);
            var li = target.parent('li');
            // Get the list of lines
            var lines = li.data('line').getNotepad().element.find('li');
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
            var li = target.parent('li');

            // Get the list of lines
            var lines = li.data('line').getNotepad().element.find('li');
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
            var li = target.parent('li');
            var ul = li.parent('ul');
            
            var newLine;
            if (target.caret() == 0) {
                newLine = li.data('line').insertLineBefore();
                li.focus();         // Focus on the line that moved down
            } else {
                newLine = li.data('line').insertLineAfter();
                newLine.focus();
            }
            
            return false;
        },
        _indent : function(event) {
            // when on the predicate, then skip to the object
            if ($(event.target).hasClass('predicate')) {
                $(event.target).parent('li').find('.object').focus();
                return false;
            }
            var li = $(event.target).parent('li');

            // when the line is top level, then don't move
            var newParentLine = li.prev();
            if (!newParentLine.length) {
                return false;
            }

            // Move current line to newParent
            newParentLine.data('line').appendLine(li);

            li.find('.object').focus();
            return false;
        },
        _unindent : function(event) {
            if ($(event.target).hasClass('object') &&
                $(event.target).parent('li').find('.predicate').css('display') != 'none') {
                $(event.target).parent('li').find('.predicate').focus();
                return false;
            }
            
            var li = $(event.target).parent('li');

            // Determine the new location
            var newPredecessor = li.parent('ul').parent('li');

            // Prevent moving if we couldn't find the new parent
            if (!newPredecessor.length) {
                return false;
            }

            // Move current line to parent
            li.insertAfter(newPredecessor);
            li.data('line').focus();
        },

        getRdfBySubject: function(uri, callback) {
            this.endpoint.getRdfBySubject(uri, callback);
        },

        defaultLabelsByUri: {
            'rdf:Property': ["property"],
            'rdfs:member':  ["member"]
        },
        _getNotepadLabelsByUri: function(label) {
            var localLabels = this.defaultLabelsByUri[label];
            // TODO: search the entire notepad
            return localLabels;
        },
        getLabelsBySubject: function(label, callback) {
            var notepadLabels = this._getNotepadLabelsByUri(label);
            if (this.endpoint === undefined) {
                return callback(notepadLabels);
            }
            this.endpoint.getLabelsBySubject(label, callback, notepadLabels);
        },

        _getNotepadPredicatesLabelsByLabel: function(label) {
            return [];
        },
        getPredicatesLabelsByLabel: function(label, callback) {
            var notepadPredicateLabels = this._getNotepadPredicatesLabelsByLabel();
            if (this.endpoint === undefined) {
                return callback(notepadPredicateLabels);
            }
            this.endpoint.getLabelsBySubject(label, callback, notepadPredicateLabels);
        },
        setRdf: function(triples) {
            this.getContainer()._updateFromRdf(triples);
        },
        
        triples: function(){
            var triples = new Triples(0);
            $.merge(triples,this.getContainer().triples());
            return triples;
        },
        deletedTriples: function() {
            return $.grep(this.triples(), function(triple) { return triple.operation === 'delete'; });
        },
        contains: function(triple) {
            var triples = this.triples();
            for(var i=0; i<triples.length; i++) {
                if (triple.equals(triples[i])) {
                    return true;
                }
            }
            return false;
        }

    });

}(jQuery));
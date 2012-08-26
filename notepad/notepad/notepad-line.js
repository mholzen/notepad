(function($, undefined) {
    $.widget("notepad.line", {

        // A line is a widget representing 
        //  1 - a URI (get/setUri)
        //  2 - an optional representation as text (get/setLineLiteral, get/setLineTriple)
        //  3 - a relationship to a container (get/setContainerTriple, get/setContainer)
        //  4 - a collection of other lines for which it is the container (getList)
                
        // A new line should have a URI but no representation.
        
        // The container defines
        //    - a container URI
        //    - a container default predicate
        
        options : {
        },

        notepad : undefined,

        // Line Uri        
        getUri: function() {
            return this.element.attr("about");
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setUri: function(uri) {
            this._setUri(uri);
            
            // Setting the URI should update the line representation and any children
            var line = this;
            this.getNotepad().getRdfBySubject(uri, function(triples) {
                line._updateFromRdf(triples);
            });
        },
        _updateFromRdf: function(triples) {
            var line = this;
            $.each(triples, function(index,triple) {
                if (triple.subject != line.getUri() || triple.predicate != 'rdfs:label') {
                    return;
                }
                line.setLineLiteral(triple.object);
            });
            line.getList().data('container')._updateFromRdf(triples);
        },

        // Container
        getContainer: function() {
                return this.element.parents('.notepad-container').data("container");
        },
        getNotepad: function() {
            return this.getContainer().getNotepad();
        },
        _getContainerUri: function() {
            return this.getContainer().getUri();
        },
        _getContainerDefaultPredicate: function() {
            return this.getContainer().getDefaultPredicate();
        },
        setContainerPredicateUri: function(uri) {
            this._setContainerPredicateUri(uri);

            var line = this;

            this.getNotepad().getLabelsBySubject(uri, function(labels) {
                if (labels.length > 1) {
                    throw "More than one label for a given uri ("+labels+")";
                }
                if (labels.length == 0) {
                    throw "Can't find a label for a predicate uri";
                }
                line._setContainerPredicateLabel(labels[0]);
            });

            if (uri != 'rdfs:member') {
                this.showContainerPredicate();
            } else {
                this.hideContainerPredicate();
            }
        },
        _setContainerPredicateUri: function(uri) {
            this.predicate.attr('rel',uri);            
        },
        setContainerPredicateLabel: function(label) {
            this._setContainerPredicateLabel(label);
            var line = this;
            this.getNotepad().getPredicatesLabelsByLabel(label,function(results) {
                var uri;
                if (results.length > 1) {
                    throw "More than one predicate with the same label ("+results+")";
                }
                if (results.length == 0) {
                    uri = $.fn.notepad.getNewUri();
                }
                line._setContainerPredicateUri(uri);
            });
        },
        _setContainerPredicateLabel: function(label) {
            this.predicate.val(label);
        },
        getContainerPredicateLabel: function() {
            return this.predicate.val();
        },
        getContainerPredicateUri: function() {
            var predicateUri = {
                uri: this.predicate.attr('rel'),
                element: this.predicate
            };
            predicateUri.__proto__.toString = function() { return this.uri; }
            return predicateUri;
        },
        _getContainerPredicateUriByLabel: function(label) {
            var uri = this.getContainer().predicateMap[label];
            if (uri === undefined) {
                throw "cannot find a uri matching the label " + label;
            }
            return uri;
        },      
        _getContainerPredicateLabelByUri: function(uri) {
            var map =  this.getContainer().predicateMap;
            for (var label in map) {
                if (map[label] == uri) {
                    return label;
                }
            }
            throw "cannot find a label from the URI "+uri;
        },
        getContainerTriple: function() {
            if (this.getUri() === undefined) {
                return undefined;
            }
            return new Triple(
                this._getContainerUri(),
                this.getContainerPredicateUri(),
                this.getUri(),
                this.predicate.hasClass("delete") ? "delete" : "update"
            );
        },
        showContainerPredicate: function() {
            this.predicateToggle.removeClass("hidden");
            this.predicateToggle.parent().children(".predicate").slideDown(100);
            this.predicateToggle.parent().children(".separator").slideDown(100);
        },
        hideContainerPredicate: function() {
            this.predicateToggle.addClass("hidden");
            this.predicateToggle.parent().children(".predicate").slideUp(100);
            this.predicateToggle.parent().children(".separator").slideUp(100);
        },
        toggleContainerPredicate: function() {
            this.predicateToggle.toggleClass("hidden");
            this.predicateToggle.parent().children(".predicate").slideToggle(100);
            this.predicateToggle.parent().children(".separator").slideToggle(100);  
        },
        getPredicateLabelTriple: function() {
            if (this.getLineLiteral() == '') {
                return undefined;
            }
            return new Triple(
                this.getContainerPredicateUri(),
                "rdfs:label",
                this.getContainerPredicateLabel()
                );
        },


        // Line representation
        _getLinePredicateUri: function() {
            return "rdfs:label";
        },
        _setLinePredicateUri: function() {
            throw "not yet implemented";
        },
        getLineLiteral: function() {
            return this.object.val();
        },
        setLineLiteral: function(text) {
            this.object.val(text);
            return this;
        },
        getLineTriple: function() {
            if (this.getLineLiteral() == '') {
                return undefined;
            }
            return new Triple(
                this.getUri(),
                this._getLinePredicateUri(),
                this.getLineLiteral()
                );
        },
        setLineTriple: function(triple) {
            this.setUri(triple.subject);
            if (triple.predicate !== 'rdfs:label') {
                throw "line triple predicate is not rdfs:label";
            }
            //this._setObjectPredicate('');  // rdfs:label
            this._setLiteral(triple.object);
        },

        // Children elements
        getList: function() {
            return this.element.children('ul');
        },
        getLines: function() {
            return this.getList().children('li');
        },
        appendLine: function(li) {
            // Find or create list
            var ul = this.getList();
            if (ul.length==0) {
                ul = $('<ul>').appendTo(this.element).container();
            }
            return ul.data('container').appendLine(li);
        },
        insertLineAfter: function() {
            var li = $('<li>').insertAfter(this.element).line();
            return li.data('line');            
        },
        insertLineBefore: function() {
            var li = $('<li>').insertBefore(this.element).line();
            return li.data('line');            
        },
        
        childTriples: function() {
            return this.getLines().map(function(index,li) {
                return $(li).data('line').triples();
            });
        },
        triples: function() {
            var triples = [];

            var line = this.getLineTriple();
            if (line !== undefined) {
                triples.push(line);
            }
            var predicate = this.getPredicateLabelTriple();
            if (predicate !== undefined) {
                triples.push(predicate);
            }
            var container = this.getContainerTriple();
            if (container !== undefined) {
                triples.push(container);
            }
            var childTriples = this.childTriples();            
            if (childTriples.length) {
                $.merge(triples, childTriples);
            }
            return triples;
        },

        focus: function() {
            return this.element.children(".object").focus();
        },

        // Set up the line widget
        _create : function() {
            var line = this;

            // Verify the container
            if(!this.getContainer()) {
                throw "when creating a new line, should find a parent container";
            }

            this.element.addClass("line");
            
            // Save the initial content of the line to later initialize the object with it.
            var objectText = this.element.text();
            this.element.text("");

            // Find whether this line has a predecessor
            var prev = $(this.element).prev().data('line');
            var prevPredicateUri = prev && prev.getContainerPredicateUri();
            
            // Predicate toggle
            this.predicateToggle = $('<a>').addClass('predicateToggle');
            this.predicateToggle.click(function(){
                line.toggleContainerPredicate();
            });

            // Predicate
            this.predicate = $('<textarea rows="1" cols="8">').addClass('predicate');
            var predicate = prevPredicateUri || this._getContainerDefaultPredicate();
            this.setContainerPredicateUri(predicate);

            var notepad = this.getNotepad();
            this.predicate.change(function(event) { 
                line.setContainerPredicateLabel( $(event.target).val() );
            });
            this.element.append(this.predicate);

            // Must turn on autocomplete *after* the element has
            // been added to the document
            this.predicate.autocomplete({
                source: function(term,callback) {
                    notepad.endpoint.getPredicatesLabelsByLabel(term.term,callback);
                },

                select : function(event,ui) {
                    var line = $(event.target).parent('li').data('line');
                    line._setContainerPredicateLabel(ui.item.label);
                    line._setContainerPredicateUri(ui.item.value);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
            
            // Separator
            var separator = $('<span>').addClass('separator');
            this.element.append(separator);

            // Insert the toggle after the ':'
            this.element.append(this.predicateToggle);
            
            // Set the initial state of predicate and separator
            var prevPredicateToggleHidden = prev && prev.element.find('.predicateToggle').hasClass('hidden');
            var newlinePredicateHidden = prevPredicateToggleHidden !== undefined ? prevPredicateToggleHidden : true;
            if ( newlinePredicateHidden ) {
                this.predicateToggle.addClass('hidden');
                this.predicate.css('display', 'none');
                separator.css('display', 'none');
            }
            
            // TODO: refactor from notepad-object.js

            // Object
            this.object = $('<textarea rows="1" cols="80">').addClass('object');
            this.element.append(this.object);

            // Only set the URI if the line is changed. to: ensure new empty lines are not saved
            this.object.change(function(event) {
                if (line.getUri() === undefined) {
                    line._setUri($.fn.notepad.getNewUri());
                }
            });

            if (objectText) {
                this.object.val(objectText);
                this.object.change();
            }

            var notepad = this.getNotepad();
            this.object.autocomplete({
                source: function(term,callback) {
                    notepad.endpoint.getSubjectsLabelsByLabel(term.term,callback);
                },
                select: function(event, ui) {
                    var line = $(event.target).parent('li').data('line');
                    line.setUri(ui.item.value);
                    line.setLineLiteral(ui.item.label);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
            
            // Children container
            $('<ul>').appendTo(this.element).container();

            // Children collapse/expand
            this.childrenToggle = $('<a>').addClass('childrenToggle');
            this.childrenToggle.click(function() {
                $(this).toggleClass("hidden");
                $(this).parent().find(".notepad-container").toggle('blind', {}, 100);
            });
            this.element.prepend(this.childrenToggle);

        },      
        _destroy : function() {
            this.element.removeClass("line").removeAttr('about');
            this.object.unbind().remove();
            this.predicate.remove();
            this.subject.unbind().remove();
        }
    });

}(jQuery));

(function($, undefined) {

    FORWARD = 0;    // TODO: put in a namespace
    BACKWARD = 1;

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

        getAttrName: function(direction) {
            return ( direction === undefined || direction === FORWARD ? "rel" : "inrel" );
        },
        getDirection: function() {
            if (this.predicate.attr(this.getAttrName(FORWARD))) {
                return FORWARD;
            } else if (this.predicate.attr(this.getAttrName(BACKWARD))) {
                return BACKWARD;
            }
            return undefined;
        },

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
            this.getNotepad().getRdf(uri, function(triples) {
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
        setContainerPredicateUri: function(uri, direction) {
            this._setContainerPredicateUri(uri, direction);

            var line = this;
            this.getNotepad().getPredicateLabels(uri, function(labels) {
                if (labels.length == 0) {
                    throw "Can't find a label given a predicate uri ("+uri+")";
                }
                if (labels.length > 1) {
                    console.log("Warning: more than one ("+labels.length+") label ["+labels+"] for a given uri ("+uri+").  Picking first ("+labels[0]+")");
                }
                var label = labels[0];
                
                line._setContainerPredicateLabel(label);
                if ((uri === 'rdfs:member' || label === 'member') && direction === FORWARD) {
                    line.hideContainerPredicate();
                } else {
                    line.showContainerPredicate();
                }
            });
        },
        _setContainerPredicateUri: function(uri, direction) {
            this.predicate.removeAttr(this.getAttrName(FORWARD));
            this.predicate.removeAttr(this.getAttrName(BACKWARD));
            this.predicate.attr(this.getAttrName(direction),uri);
        },
        setContainerPredicateLabel: function(label) {
            this._setContainerPredicateLabel(label);
            var line = this;
            this.getNotepad().getPredicatesLabelsByLabel(label,function(results) {
                var uri;
                if (results.length == 0) {
                    uri = $.fn.notepad.getNewUri();
                } else {
                    uri = results[0].value;
                }
                if (results.length > 1) {
                    console.log("Warning: more than one ("+results.length+") uri ["+results.toString()+"] for a given label ("+label+").  Picking first ("+uri+")");
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
                uri: this.predicate.attr(this.getAttrName(FORWARD)) || this.predicate.attr(this.getAttrName(BACKWARD)),
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
            var subject, object;
            if (this.getDirection() === FORWARD) {
                subject = this._getContainerUri();
                object = this.getUri();
            } else {
                subject = this.getUri();
                object = this._getContainerUri();
            }
            return new Triple(
                subject,
                this.getContainerPredicateUri(),
                object,
                this.predicate.hasClass("delete") ? "delete" : "update"
            );
        },
        showContainerPredicate: function() {
            this.predicateToggle.removeClass("hidden");
            this.predicateToggle.parent().children(".notepad-predicate").slideDown(100);
            this.predicateToggle.parent().children(".notepad-separator").slideDown(100);
        },
        hideContainerPredicate: function() {
            this.predicateToggle.addClass("hidden");
            this.predicateToggle.parent().children(".notepad-predicate").slideUp(100);
            this.predicateToggle.parent().children(".notepad-separator").slideUp(100);
        },
        toggleContainerPredicate: function() {
            this.predicateToggle.toggleClass("hidden");
            this.predicateToggle.parent().children(".notepad-predicate").slideToggle(100);
            this.predicateToggle.parent().children(".notepad-separator").slideToggle(100);  
        },
        getPredicateLabelTriple: function() {
            if (this.getLineLiteral() == '' || this.getContainerPredicateLabel() == '') {
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
        getChildContainer: function() {
            return this.getList().data('container');
        },
        getLines: function() {
            return this.getChildContainer().getLines();
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
            return this.getChildContainer().triples();
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
            return this.element.children(".notepad-object").focus();
        },

        indent : function() {
            // when the line is top level, then don't move
            var newParentLine = this.element.prev('li');
            if (!newParentLine.length) {
                return false;
            }

            // Move current line to newParent
            newParentLine.data('line').appendLine(this.element);
        },
        unindent : function(event) {
            // Determine the new location
            var newPredecessor = this.element.parent('ul').parent('li');

            // Prevent moving if we couldn't find the new parent
            if (!newPredecessor.length) {
                return false;
            }

            // Move current line to parent
            this.element.insertAfter(newPredecessor);
        },


        // Set up the line widget
        _create : function() {
            var line = this;

            // Verify the container
            if(!this.getContainer()) {
                throw "when creating a new line, should find a parent container";
            }

            this.element.addClass("notepad-line");
            
            // Save the initial content of the line to later initialize the object with it.
            var objectText = this.element.text();
            this.element.text("");

            // Find whether this line has a predecessorPredicate
            var predecessor = $(this.element).prev().data('line');
            var predecessorPredicate = predecessor && predecessor.getContainerPredicateUri();
            
            // Predicate toggle
            this.predicateToggle = $('<a>').addClass('predicateToggle');
            this.predicateToggle.click(function(){
                line.toggleContainerPredicate();
            });

            // Predicate
            this.predicate = $('<textarea rows="1" cols="8">').addClass('notepad-predicate');
            var predicate = predecessorPredicate || this._getContainerDefaultPredicate();
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
                    notepad.getPredicatesLabelsByLabel(term.term,callback);
                },

                select : function(event,ui) {
                    var line = $(event.target).parent('li').data('line');
                    line._setContainerPredicateLabel(ui.item.label);
                    line._setContainerPredicateUri(ui.item.value);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
            
            // Separator
            var separator = $('<span>').addClass('notepad-separator');
            this.element.append(separator);

            // Insert the toggle after the ':'
            this.element.append(this.predicateToggle);
            
            // Set the initial state of predicate and separator
            var prevPredicateToggleHidden = predecessor && predecessor.element.find('.predicateToggle').hasClass('hidden');
            var newlinePredicateHidden = prevPredicateToggleHidden !== undefined ? prevPredicateToggleHidden : true;
            if ( newlinePredicateHidden ) {
                this.predicateToggle.addClass('hidden');
                this.predicate.css('display', 'none');
                separator.css('display', 'none');
            }
            
            // TODO: refactor from notepad-object.js

            // Object
            this.object = $('<textarea rows="1" cols="80">').addClass('notepad-object');
            this.element.append(this.object);

            // Only set the URI if the line is changed. to: ensure new empty lines are not saved
            this.object.change(function(event) {
                if (line.getUri() === undefined) {
                    line._setUri($.fn.notepad.getNewUri());
                }
            });


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

            if (objectText) {
                this.object.val(objectText);
                this.object.change();
            }

            // For all columns, create objects
            var line = this;
            _.each( this.getContainer().getColumns(), function(column) {
                var objectElement = $('<div>');
                objectElement.addClass(column.getCssClass());
                objectElement.appendTo(this.element);
                objectElement.object();

                var object = objectElement.data('object');
                object.setPredicate(column);
                object.setSubject(line);
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
            this.element.removeClass("notepad-line").removeAttr('about');
            this.object.unbind().remove();
            this.predicate.remove();
            this.subject.unbind().remove();
        },

    });

}(jQuery));

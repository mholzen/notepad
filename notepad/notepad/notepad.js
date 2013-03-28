// See README.txt

(function($, undefined) {

    var DEFAULT_ENDPOINT = new Triples();

    $.widget("notepad.notepad", {
        options: {
        },
        _setOption: function(key, value) {
            switch(key) {
                case 'endpoint':
                this.element.data('notepadEndpoint').option('endpoint', value);
                break;
            }
            this._super(key, value);
        },

        newUri: function() {
            this._setUri($.notepad.getNewUri());
            var line = this.getContainer().appendLine();  // Start with one empty line
            line.focus();
        },
        getUri: function() {
            return this.element.attr('about');
        },
        _setUri: function(uri) {
            if (!(uri instanceof Resource)) {
                uri = new Resource(uri);
            }
            this.element.attr('about',uri);

            // The following code is necessary for the rdfa() gleaner to work properly.
            // Ideally, it would use the same 'about' attribute in the top level notepad element
            // but it requires the URI to be prefixed with '#' rather than ':'
            this.element.children('.title').attr('about', $.notepad.uri() + '#' + uri.toString().slice(1));
            this.element.find('[property="notepad:uri"]').append($('<a>').attr('href',uri.toURL()).text("permalink"));
        },
        setUri: function(uri) {
            if (!uri) {
                return this.newUri();
            }
            this._setUri(uri);
            this.getContainer().load();
        },
        open: function(uri) {
            this.unloaded(this.getContainer().triples());           // to avoid triples being marked as deleted
            this.getContainer().element.remove();
            var line = this.getContainer().appendLine();            // getContainer() will recreate the deleted element
            line.setUri(uri);
        },
        getContainer: function() {
            var element = this.element.children(':notepad-container');
            if (element.length === 0) {
                element = $('<ul>').appendTo(this.element).container();
            }
            return element.data('notepadContainer');
        },
        getLines: function() {
            return this.getContainer().getLines();
        },

        // Set up the notepad
        _create: function() {
            var notepad = this;

            this.element.addClass("notepad");

            this.element.endpoint({display: true});  // Create the endpoint widget

            if (this.options.endpoint instanceof Array
                && this.options.endpoint.length > 0
                && !(this.options.endpoint[0] instanceof Triple)
                ) {
                this.discoverEndpoint(this.options.endpoint, function() {
                    notepad.setUri(notepad.element.attr('about'));
                });
            } else {
                this.option('endpoint', this.options.endpoint);
                this.setUri(this.element.attr('about'));            // if no [about] attr, setUri(undefined) calls newUri().
            }
            
            this.element.on("keydown.notepad", function(event) {
                var keyCode = $.ui.keyCode;
                switch (event.keyCode) {
                case keyCode.ENTER:
                case keyCode.NUMPAD_ENTER:
                    return notepad.splitLines(event);
                    break;
                case keyCode.BACKSPACE:
                    return notepad.joinLines(event);
                    break;
                case keyCode.UP:
                    return notepad._up(event);
                    break;
                case keyCode.DOWN:
                    return notepad._down(event);
                    break;
                case keyCode.TAB:
                    if (!event.shiftKey) {
                        if (notepad._indent(event)) {
                            return false; // don't propagate; keypress was handled
                        }
                    } else {
                        if (notepad._unindent(event)) {
                            return false; // don't propagate; keypress was handled
                        }
                    }
                    break;
                default:
                    break;
                }
            });

            $('body').on('keydown', function(event) {
                if ( $(event.target).attr('contenteditable') === 'true' ) {
                    return;
                }
                if (event.keyCode === 82 /* R */ && ! event.metaKey /* avoid overriding Cmd-R reload*/ ) {
                    notepad.reset();
                    return false;
                }
                if (event.keyCode === 83 /* S */ && event.metaKey /* avoid overriding Cmd-S save */) {
                    notepad.save();
                    return false;
                }
            });

            // notepad:created rdfs:subPropertyOf dc:created

            this.element.find('[property="notepad:created"]').attr('content',Date.now());
            setInterval(function() {
                $("[property='notepad:created']").each(function(i,e) {
                    $(e).text(moment(parseInt($(e).attr('content'))).fromNow());
                });
            }, 1000);

            // this.element.on("mouseover", '[about]', function(event) {
            //     if (event.metaKey) {
            //         console.log('wrapping');
            //         $(this).wrap('<a href="'+$(this).attr('about')+'">navigate to</a>');
            //         event.stopPropagation();
            //     }
            // });
            // this.element.on("mouseout", '[about]', function(event) {
            //     if (event.metaKey) {
            //         $(this).wrap('<a href="'+$(this).attr('about')+'">navigate to</a>');
            //     }
            // });

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
            var lines = li.data('notepadLine').getNotepad().getContainer().getAllLineElements().filter(':visible');
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i>0) {
                $(lines[i-1]).data('notepadLine').focus();
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
            var lines = li.data('notepadLine').getNotepad().getContainer().getAllLineElements().filter(':visible');
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i<lines.length-1) {
                $(lines[i+1]).data('notepadLine').focus();
            }
            return false;   // Prevent default behaviour
        },
        splitLines: function(event) {
            var target = $(event.target);
            var li = target.closest(":notepad-line");
            if (li.length === 0) {
                return false;
            }
            var line = li.data('notepadLine');

            var caret = target.caret();
            if (caret == 0) {       // caret is at the beginning of the line
                line.insertLineBefore();
                // Stay focused on the current line, which was pushed down by the new line above it
                return false;
            }

            var newLine = line.insertLineAfter();
            
            // find closest literal
            var literalElement = target.closest(":notepad-literal");
            if (literalElement.length === 0) {
                return false;
            }
            var literalWidget = literalElement.data('notepadLiteral');
            if (literalWidget.getLiteral().datatype() !== 'xsd:string') {
                return false;
            }

            var literal = literalWidget.getLiteral().toString();

            var beforeCaret = literal.slice(0,caret),
            afterCaret = literal.slice(caret);

            literalWidget.setLiteral(beforeCaret);
            newLine.showChildren();

            var promise = newLine.getObject().uri().setLabel(afterCaret);
            // promise.then(function() {
                newLine.focus()
            // });
            
            return false;
        },
        joinLines: function(event) {
            var target = $(event.target);

            // find closest literal
            var literalElement = target.closest(":notepad-literal");
            if (literalElement.length === 0) {
                return false;
            }
            if (literalElement.caret() !== 0) {
                // We are not at the beginning of the literal
                return;
            }

            var li = target.closest(":notepad-line");
            if (li.length === 0) {
                return;
            }
            var line = li.data('notepadLine');

            var prev = li.prev();
            if (prev.length === 0) {
                // We are at the beginning of the list.  Should join with the literal above us.
                return;
            }

            
            var literalWidget = literalElement.data('notepadLiteral');
            var literal = literalWidget.getLiteral();

            var previousLine = prev.data('notepadLine');

            var previousLiteral = previousLine.getObject();
            previousLiteral = previousLiteral + literal;

            li.remove();

            //.previousLine.getObject().focus();

            previousLine.element.caretToEnd().focus();

            return false;

        },

        _indent: function(event) {
            var li = $(event.target).closest(":notepad-line");
            if ( li.length === 0 ) {
                return false;
            }

            // when on the predicate, then skip to the object
            if ($(event.target).hasClass('notepad-predicate')) {
                li.find('.notepad-object:first').focus();
                return false;
            }

            var line = li.data('notepadLine');
            if ( ! line.indent() ) {
                return false;
            }
            line.focus();
            return true;
        },
        _unindent: function(event) {
            var li = $(event.target).closest(":notepad-line");
            if ( li.length === 0 ) {
                return false;
            }

            if ($(event.target).hasClass('notepad-object3') &&
                li.find('.notepad-predicate-label').css('display') != 'none') {
                li.find('.notepad-predicate-label').focus();
                return false;
            }
            var line = li.data('notepadLine');
            if ( ! line.unindent() ) {
                return false;
            }
            line.focus();
            return true;
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
            return this.element.data('notepadEndpoint').getEndpoint();
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

            var rdf = this.element.children('div').rdf();
            rdfaTriples = $.notepad.toTriples(rdf.databank);  // This shouldn't need its own code
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
            if (triple === undefined) {
                return this._loaded;
            }
            this._loaded.add(triple);
            return this._loaded;
        },
        unloaded: function(triples) {
            if (!this._loaded) {
                return;
            }
            this._loaded = this._loaded.minus(triples);
        },
        canSave: function(triple) {
            return (triple.predicate != 'nmo:htmlMessageContent' && triple.predicate != 'nmo:plainTextMessageContent');
            // could be generalized to excluding any objects that cannot be edited by the current notepad (images, audio, svg, ...)
        },
        added: function() {
            return this.triples().minus( this.loaded() ).filter(this.canSave);
        },
        removed: function() {
            return this.loaded().minus( this.triples() ).filter(this.canSave);
        },

        _save: function() {
            var removed = notepad.removed();
            var added = notepad.added();
            var command = removed.deleteSparql() + added.insertSparql();
            return notepad.getEndpoint().execute(command).success(function() {
                notepad.loaded(added);
                notepad.unloaded(removed);
            });
        },

        save: function() {
            $("#status").text("Saving...");
            return this._save()
                .success(function() {
                    $("#status").text('Saved.');
                });
                // Dispaying an error is handled by the ajaxError handler
        },

        discoverEndpoint: function(uris, callback) {

            var endpointWidget = this.element.data('notepadEndpoint');

            var uriList = "<ol>" + uris.map(function(uri) {return "<li>"+uri+"</li>"; }).join('') + "</ol>";
            var activityDescription = {
                'a': 'prov:Activity',
                'rdfs:label': "was set to the first responding server, given the list:" + uriList,
                'prov:affects': {
                    a: 'sp:TriplePattern',
                    'sp:subject': this.getUri(),
                    'sp:predicate': 'notepad:endpoint',
                    'sp:object': 'spin:_uri'                      // could be ommitted if absent implies a variable
                },
                'prov:used': uris,
                // could add 'prov:agent' or 'prov:plan': this function URI

            };
            // so that the notepad can display tooltips over the field and value
            // could be: describeActivity(endpointWidget, uris));


            this.element.find("[property='notepad:endpoint']").tooltip({
                content: function() {
                    return activityDescription['rdfs:label'];
                },
                items: "[rel='rdfs:label']",
                position: { my: "left top", at: "left bottom+10" }
             });    
            // could be: displayAffectingActivities(endpointWidget, endpointProvenance);
            // could be: this.displayAffectingActivities(); this.add(activityDescription);

            endpointWidget.setUriToFirstResponding(uris, callback);
        },

        disableEdit: function() {
            this.element.find('[contenteditable="true"]').attr('contenteditable', 'false');
        },
        enableEdit: function() {
            this.element.find('[contenteditable="false"]').attr('contenteditable', 'true');
        },
        remove: function(line) {
            if (line.modified()) {
                alert('discard changes?');
            }
            // verify if line has modified
            line.remove();
        },
        focus: function() {
            this.getContainer().element.find("[contenteditable='true']:visible:first").focus()
        },
        reset: function() {
            // should: confirm if changes will be discarded
            this.getContainer().reset();
            this.focus();
            return this;
        },

    });
    
}(jQuery));
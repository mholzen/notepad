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
                case 'dataset':
                    this.element.data('notepadEndpoint').option('dataset', value);
                    break;
            }
            this._super(key, value);
        },

        newUri: function() {
            this._setUri($.notepad.newUri());
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
            return this.getContainer().load();
        },
        ul: function() {
            var container = this.element.find('ul.data');
            return container.length ? container : $('<ul class="data">').appendTo(this.element);
        },
        getContainer: function() {
            var element = this.element.children(':notepad-container');
            if (element.length === 0) {
                element = this.ul().container();
            }
            return element.data('notepadContainer');
        },
        getLines: function() {
            return this.getContainer().getLines();
        },
        getSession: function() {
            return this.element.data('notepadSession');
        },

        // Set up the notepad
        _create: function() {
            var notepad = this;

            this.element.addClass("notepad").session({triples: this._triples.bind(notepad)});

            // Create the endpoint widget
            this.element.endpoint({
                endpoint: this.options.endpoint,
                display: true
            });

            this.setUri(this.element.attr('about'));            // if no [about] attr, setUri(undefined) calls newUri().
            
            this.element.on("keydown.notepad", function(event) {
                var keyCode = $.ui.keyCode;
                switch (event.keyCode) {
                case keyCode.ENTER:
                case keyCode.NUMPAD_ENTER:
                    if (event.shiftKey) {
                        return;     // pass up, to allow insert newline
                    }
                    return notepad.splitLines(event);
                    break;
                case keyCode.BACKSPACE:
                    return notepad.joinLines(event);
                    break;
                case keyCode.UP:
                    if ( $(event.target).data("notepadAutocomplete2").menu.active ) {
                        return;     // let autocomplete handle this event
                    }
                    return notepad._up(event);
                    break;
                case keyCode.DOWN:
                    if ( $(event.target).data("notepadAutocomplete2").menu.active ) {
                        return;     // let autocomplete handle this event
                    }
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
                case keyCode.SPACE:
                    if (event.ctrlKey) {
                        var line = $(event.target).closest(":notepad-line").data('notepadLine');
                        line.option('describeDepth', 1);
                        line.childrenToggle();
                        // Must prevent autocomplete from triggering
                    }
                    break;
                case 83: /* s */
                    if (event.metaKey || event.ctrlKey) { // Cmd-S or Ctrl-S
                        event.preventDefault(); // prevents save dialog
                        notepad.save();
                    }

                default:
                    break;
                }
            });

            this.element.on('keyup', '.notepad-object3 [contenteditable="true"]', function(event) {
                var target = $(event.target);
                if (event.keyCode != 186 /* colon */ ) {
                    return;
                }
                var line = target.closest(":notepad-line");
                if (!line) {
                    log.error("cannot find a line widget");
                    return;
                }
                line = line.data('notepadLine');
                if (line.isPredicateVisible()) {
                    log.info("predicate is already shown.  Ignoring ':'");
                    return;
                }
                line.discoverPredicate(event);
            });

            // Place the caret at line end, when clicking at the end of a line
            this.element.on('click', '.notepad-line', function(event) {
                // should: profile to understand why it feels sluggish
                if ( ! $.contains($(event.currentTarget)[0], document.activeElement) ) {
                    console.debug('line does not contain element that has the focus');
                    $(event.currentTarget).data('notepadLine').focus().caretToEnd();
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
                if (event.keyCode === 83 && (event.metaKey || event.ctrlKey)) {  // Cmd-S or Ctrl-S
                    notepad.save();
                    return false;
                }
            });

            // dc:created rdfs:subPropertyOf dc:created

            this.element.find('[property="dc:created"]').attr('content',Date.now());
            setInterval(function() {
                $("[property='dc:created']").each(function(i,e) {
                    $(e).text(moment(parseInt($(e).attr('content'))).fromNow());
                });
            }, 1000);

            if ($("#menu").length > 0) {
                this._createMenu();
            }

        },
        _createMenu: function() {
            $("#menu").menu2().hide();

            $("#menu-button").hover(function(event) {
                $("#menu").show();
            }).click(function(event) {
                $("#menu").show();
            });

            $("#control").hide();

            this.element.on('focus', '[contenteditable="true"]', function(event) {
                var line = $(event.target).closest(':notepad-line');
                if ( !line.length ) {
                    return false;
                }
                var literal = $(event.target).closest(':notepad-literal');
                if ( literal.length > 0 ) {
                    var menu = $("#menu").data('notepadMenu2');
                    if (! menu) {
                        console.error('[notepad]', "cannot find menu -- somebody killed it!");
                        return;
                    }
                    $("#menu").data('notepadMenu2').option('source', literal );
                }

                $("#control").show().insertBefore(line.data('notepadLine').getChildList());
            });

            $("body").click(function(event) {
                if ($(event.target).parents("#menu-button").length === 0) {         // if we are not clicking on the menu button
                    $("#menu").fadeOut("100");
                }
            });
        },
        _destroy : function() {
            this.element.removeClass("notepad").removeAttr('about').unbind();
            this.element.children().remove();
        },
        _up: function(event) {
            var target = $(event.target);
            var li = target.closest(':notepad-line');
            if (li.length === 0) {
                return;
            }

            // Get the list of lines
            var lines = this.getContainer().getAllLineElements().filter(':visible');
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
            var lines = this.getContainer().getAllLineElements().filter(':visible');
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
                return;  // for others to handle
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

        // should: deprecate
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

        // should: deprecate
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
        
        _triples: function() {
            var triples = new Triples();

            // var rdf = this.element.children('div').rdf();
            // rdfaTriples = $.notepad.toTriples(rdf.databank);  // This shouldn't need its own code
            // triples.add(rdfaTriples);

            triples.push(toTriple(this.getUri(), "rdf:type", "inst:Session")); // ALT: use RDFAs typeof attribute instead

            var user = this.option('identity');
            if (user) {
                triples.push(toTriple(this.getUri(), "dc:creator", user)); // ALT: use RDFAs typeof attribute instead
            }
            return triples;
        },
        triples: function(){
            var triples = this._triples();
            triples.add(this.getContainer().triples());
            return triples;
        },
        contains: function(triple) {
            return this.triples().contains(triple);
        },
        expresses: function(triple) {
            return this.triples().expresses(triple);
        },
        reset: function(uri) {
            // should: confirm if changes will be discarded
            $("#control").hide().appendTo('body');  // move the control out of the line to remove
            this.getSession().reset();
            this.getContainer().reset();
            if (uri) {
                this.getContainer().getAllLines()[0].setUri(uri);
            }
            this.focus();
            return this;
        },

        _save: function() {
            var session = this.getSession();
            var removed = session.removed();
            var added = session.added();
            return this.getEndpoint().deleteInsertData(removed, added)
                .success(function() {
                    session.loaded(added);
                    session.unloaded(removed);
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
                    'sp:predicate': 'sd:endpoint',
                    'sp:object': 'spin:_uri'                      // could be ommitted if absent implies a variable
                },
                'prov:used': uris,
                // could add 'prov:agent' or 'prov:plan': this function URI

            };
            // so that the notepad can display tooltips over the field and value
            // could be: describeActivity(endpointWidget, uris));


            this.element.find("[property='sd:endpoint']").tooltip({
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
        focus: function() {
            this.getContainer().element.find("[contenteditable='true']:visible:first").focus()
        },
        remove: function(line) {
            // if (line.modified()) {
            //     alert('discard changes?');
            // }
            $("#control").appendTo('body');         // move the control out of the line to remove
            line.remove();
        },
        delete: function(line) {
            // if (line.modified()) {
            //     alert('discard changes?');
            // }
            $("#control").appendTo('body');         // move the control out of the line to remove
            line.delete();
        },
    });

}(jQuery));
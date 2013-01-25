// See README.txt

(function($, undefined) {

    var DEFAULT_ENDPOINT = new Triples();

    $.widget("notepad.notepad", {
        options: {
            endpoint: DEFAULT_ENDPOINT
        },
        _setOption: function(key, value) {
            switch(key) {
                case 'endpoint':
                this.element.endpoint({endpoint: value, display: true});
                break;
            }
            this._super(key, value);
        },

        getUri: function() {
            return this.element.attr('about');
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);

            // The following code is necessary for the rdfa() gleaner to work properly.
            // Ideally, it would use the same 'about' attribute in the top level notepad element
            // but it requires the URI to be prefixed with '#' rather than ':'
            this.element.children('.title').attr('about', $.notepad.uri() + '#' + uri.toString().slice(1));
        },
        setUri: function(uri) {
            this._setUri(uri);
            
            // Setting the URI should update the line representation and any children
            var container = this.getContainer();
            this.getRdf(uri, function(triples) {
                container._updateFromRdf(triples);
            });
        },
        open: function(uri) {
            this.unloaded(this.getContainer().triples());           // to avoid triples being marked as deleted
            this.getContainer().element.remove();
            var line = this.getContainer().appendLine();            // getContainer() will recreate the deleted element
            line.setUri(uri);
        },
        getContainer: function() {
            var element = this.element.children('ul');
            if (element.length === 0) {
                element = $('<ul>').appendTo(this.element).container();
            }
            return element.data('notepadContainer');
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

            this.getContainer().appendLine();  // Start with one empty line
            
            this.element.on("keydown.notepad", function(event) {
                if($(event.target).data('uiAutocomplete') && $(event.target).data('uiAutocomplete').menu.active) {
                    // The autocomplete menu is active, let it handle keyboard events
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

            this.element.find('[property="notepad:created"]').attr('content',Date.now());
            setInterval(function() {
                $("[property='notepad:created']").each(function(i,e) {
                    $(e).text(moment(parseInt($(e).attr('content'))).fromNow());
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
            var lines = li.data('notepadLine').getNotepad().getContainer().getAllLineElements();
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
            var lines = li.data('notepadLine').getNotepad().getContainer().getAllLineElements();
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
        _return: function(event) {
            var target = $(event.target);
            var li = target.closest(":notepad-line");
            if (li.length === 0) {
                return false;
            }
            var caret = target.caret();
            
            var line = li.data('notepadLine');
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

            var line = li.data('notepadLine');
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
            var line = li.data('notepadLine');
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
    });
    

    $.notepad.discoverEndpoint = function(notepad) {

        var host = $.uri.base().authority;
        var endpointUri = "http://" + host + ":3030/dev";
        var uris = [endpointUri, 'http://instruct.vonholzen.org:3030/dev'];

        var endpointWidget = notepad.element.data('notepadEndpoint');

        var activityDescription = {
            'a': 'prov:Activity',
            'rdfs:label': "was set to the first responding server, of the list: [" + uris +"]",
            'prov:affects': {
                a: 'sp:TriplePattern',
                'sp:subject': notepad.uri,
                'sp:predicate': 'notepad:endpoint',
                'sp:object': 'spin:_uri'                      // could be ommitted if absent implies a variable
            },
            'prov:used': uris,
            // could add 'prov:agent' or 'prov:plan': this function URI

        };
        // so that the notepad can display tooltips over the field and value
        // could be: describeActivity(endpointWidget, uris));


        notepad.element.find("[property='notepad:endpoint']").tooltip({content: function() {
            return activityDescription['rdfs:label'];
        }, items: "[rel='rdfs:label']",
        position: { my: "left top", at: "left bottom+10" }
         });    
        // could be: displayAffectingActivities(endpointWidget, endpointProvenance);
        // could be: notepad.displayAffectingActivities(); notepad.add(activityDescription);

        endpointWidget.setUriToFirstResponding(uris);
    }

}(jQuery));
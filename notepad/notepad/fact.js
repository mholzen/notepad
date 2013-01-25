(function($, undefined) {

    // manages a collection triples relating the one subject
    // (setUri(),getUri(),getSubjectLabel())
    // provides adding/removing triples via API and via the DOM.  Maintains the two in sync.


    $.widget("notepad.fact", {

        options : {
        },

        setUri: function(uri) {
            this.element.attr('about', uri);
            if (!this.getSubjectLabel()) {
                this._insertSubjectLabel();
                this.getSubjectLabel().load();
            }
        },
        getUri: function() {
            return this.element.closest('[about]').attr('about');
        },
        getSubjectLabel: function() {
            return this.element.children('.notepad-label').data('notepadLabel');
        },
        _insertSubjectLabel: function() {
            $('<div>').prependTo(this.element).label({uriElement: this.element});
        },

        getPredicates: function(predicateUri) {
            var predicates = this.element.children('.notepad-predicate');       // should also find labels
            if (predicateUri !== undefined) {
                predicates = predicates.filter('[rel="'+predicateUri+'"]');
            }
            return predicates.map(function(i,e) {return $(e).data('notepadPredicate');});
        },
        insertPredicate: function(predicateUri) {
            return $('<div>').prependTo(this.element).predicate().data('notepadPredicate');
        },
        setTriple: function(triple) {
            this.setUri(triple.subject);
            this.add(triple);
        },
        add: function(triple) {
            if (this.getUri() === undefined) {
                this.setUri(triple.subject);
            } else if (this.getUri() != triple.subject) {
                // if this label is within a URI context, it does not permit setting the context
                return;
            }
            var predicates = this.getPredicates(triple.predicate);
            var predicate;
            if (predicates.length === 0) {
                predicate = this.insertPredicate(triple.predicate);
            } else {
                predicate = predicates[0];
            }
            predicate.setUri(triple.predicate);
            predicate.add(triple);

        },

        triples: function() {
            var triples = new Triples();
            if (this.getSubjectLabel() && this.getSubjectLabel().triple()) {
                triples.push(this.getSubjectLabel().triple());
            }
            _.each(this.getPredicates(), function(predicate) {
                $.merge(triples, predicate.triples());
            });
            return triples;
        },

        _create: function() {
            this.element.addClass("notepad-fact");
            if (this.element.attr('about')) {
                this.setUri(this.element.attr('about'));
            }
            if (this.options.initialTriple !== undefined) {
                this.setUri(this.options.initialTriple.subject);
                this.add(this.options.initialTriple);
            }
        },
        _destroy : function() {
            this.element.removeClass("notepad-fact").removeAttr('about');
        },

    });

}(jQuery));

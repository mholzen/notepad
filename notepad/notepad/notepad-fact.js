(function($, undefined) {

    // manages a collection triples relating the one subject
    // (setUri(),getUri(),getSubjectLabel())
    // provides adding/removing triples via API and via the DOM.  Maintains the two in sync.


    $.widget("notepad.fact", {

        // See notepad.js for interface

        options : {
        },

        setUri: function(uri) {
            this.element.attr('about', uri);
            if (this.getSubjectLabel() === undefined) {
                this._insertSubjectLabel();
            }
        },
        getUri: function() {
            return this.element.closest('[about]').attr('about');
        },
        getSubjectLabel: function() {
            return this.element.children('.notepad-label').data('label');
        },
        _insertSubjectLabel: function() {
            var element = $('<div>').prependTo(this.element).label();
        },

        getPredicates: function(predicateUri) {
            var predicates = this.element.children('.notepad-predicate');
            if (predicateUri !== undefined) {
                predicates = predicates.filter('[rel='+predicateUri+']');
            }
            return predicates.map(function(i,e) {return $(e).data('predicate');});
        },
        insertPredicate: function(predicateUri) {
            return $('<div>').appendTo(this.element).predicate().data('predicate');
        },
        setTriple: function(triple) {
            this.setUri(triple.subject);
            this.add(triple);
        },
        add: function(triple) {
            if (this.getUri() != triple.subject) {
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

            // if (this.getUri() === undefined) {
            //     // No URI context in the element
            //     this.setSubjectUri(triple.subject);
            //     this.setContainerPredicateUri(triple.predicate, FORWARD);
            //     this.setObjectResource(triple.object);
            //     return;
            // }
            // if (triple.subject.equals(this.getUri())) {
            //     // No need to set the subject
            //     this.setContainerPredicateUri(triple.predicate, FORWARD);
            //     this.setObjectResource(triple.object);
            //     return;
            // }
            // if (triple.object.equals(this.getUri())) {
            //     this.setSubjectUri(triple.object);  
            //     this.setContainerPredicaterUri(triple.predicate, BACKWARD);
            //     this.setObjectResource(this.subject);
            //     return;
            // }
            // this.setSubjectUri(triple.subject)
            // this.setContainerPredicateUri(triple.predicate, FORWARD);
            // this.setObjectResource(triple.object);
        },

        triples: function() {
            var triples = new Triples(0);
            triples.push(this.getSubjectLabel().triple());
            _.each(this.getPredicates(), function(predicate) {
                $.merge(triples, predicate.triples());
            });
            return triples;
        },

        // Set up the line widget
        _create: function() {
            this.element.addClass("notepad-fact");
            if (this.element.attr('about')) {
                this.setUri(this.element.attr('about'));
            }
        },
        _destroy : function() {
            this.element.removeClass("notepad-fact").removeAttr('about');
        },

    });

}(jQuery));

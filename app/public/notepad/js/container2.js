(function($, undefined) {

    var WIDGET_CLASSNAME = "notepad-container2";

    function hashCode(i) {
        if (i.subject !== undefined) {
            return i.subject;
        } else {
            return $(i).data('notepadFact').getUri(); // TODO: tie to container2.options
        }
    }

    $.widget("notepad.container2", {

        // elementClass widget requirements
        // --------------------------------
        // elementClass = jQuery.elementFactory( {initialTriple: triple })
        // elementClass.triples()
        // elementClass.addTriple(triple)
        // PROBABLY: elementClass.removeTriple()

        // A container should act as a "set of elements, where two elements e1, e2 are equal iff e1.getUri() === e2.getUri()"
        // We need a hashCode(element) and a hashCode(triple)

        // The implementation (element) is offering a List interface

    
        options: {
            elementClass: 'notepad-fact',
            elementName: 'notepadFact',
            elementFactory: $.fn.fact,           // Requires fact.js to be loaded
            element: "<div>",                // Could dynamic based on context (ie. within select -> option)
            sort: true
        },

        _setOption: function(key, value) {
            this._super(key, value);        // We have jquery-ui 1.9
        },
        _create: function() {
            this.element.addClass(WIDGET_CLASSNAME);

            var endpoint = new ContainerChainEndpoint(this);
            this.element.endpoint({endpoint: endpoint});
        },
        _destroy: function() {
            this.element.removeClass(WIDGET_CLASSNAME).removeAttr('about');
        },

        // iterator
        elements: function() {
            return this.element.find(":"+this.options.elementClass);
        },

        _findElement: function(hashCodeToFind) {
            var list = this.elements();
            return _.find(list, function(e) { return hashCode(e) == hashCodeToFind; });
        },

        triples: function() {
            var triples = new Triples();
            triples.concat(this.pendingTriples);
            var widget = this;
            _.each(this.elements(), function(element) {
                var elementTriples = $(element).data(widget.options.elementName).triples();
                $.merge(triples, elementTriples);
            });
            return triples;
        },

        // add
        addElement: function(newElement) {
            newElement = newElement || element = this.options.elementFactory.apply($(this.options.element));
            var element = this._findElement(newElement);
            if (element) {
                return false;
            }
            newElement.appendTo(this.element);
            return true;
        },
        addTriple: function(triple) {
            if (this.triples().expresses(triple)) {
                log.debug("Triple already expressed in the container");
                return;
            }
            var element = $(this._findElement(hashCode(triple)));
            if (element.length !== 0) {
                return element.data(this.options.elementName).add(triple);
            }

            // New element
            element = $(this.options.element).appendTo(this.element);
            this.options.elementFactory.call(element, {initialTriple: triple});
            return element;
        },

        // addAll
        addAllTriples: function(triples) {
            this.pendingTriples = this.pendingTriples || new Triples();
            $.merge(this.pendingTriples, triples);
            var triple;
            while (triple = this.pendingTriples.shift()) {
                this.addTriple(triple);
            }
        },
    });

}(jQuery));


















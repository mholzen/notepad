(function($, undefined) {

    $.widget("notepad.column", {

        // A column is a container that, given a source container, maps as many triples as they are URIs in the source container, of one given predicate
        // *** what a moutfull !!!! *****

        getContainer: function() {
            return this.element.closest('.notepad-container').data('container');
        },

        setPredicateUri: function(predicateUri) {
            this.predicateUri = predicateUri;
            // TODO: replace with a DOM element to make the predicate editable
        },
        getPredicateUri: function() {
            return this.predicateUri;
        },

        append: function(line) {
            if (line === undefined) {
                line = $('<li>');
            }
            if (line.appendTo === undefined) {
                line = $('<li>').text(line);
            }
            line.appendTo(this.element).object();
            return line.data('object');
        },
        getCssClass: function() {
            return "notepad-column-" + this.getContainer().getHeaderPosition(this.element);
        },
        getObjects: function() {
            return this.element.children('li').map(function(index, line) { return $(line).data('object'); } );      // TODO: refactor with container.getLines()
        },

        // Set up the widget
        _create : function() {
            this.element.addClass("notepad-column");

            // Turn the header element into a predicate
            this.element.predicate();

            this.element.addClass(this.getCssClass());

            // We need a container to get lines
            if (this.getContainer() === undefined) {
                throw new Error("Cannot find a source container for this column");
            }

            var column = this;
            _.each( this.getContainer().getAllLines(), function(line) {
                var objectElement = $('<div>').insertAfter(line.element.find('.notepad-object3')[0]);

                // Display this object within a column
                objectElement.addClass(column.getCssClass());

                var object = objectElement.object().data('object');
                object.option('predicate', column.element);
            });
        },
        _destroy : function() {
            this.element.removeClass("notepad-container").removeAttr('about');
        },

    });

}(jQuery));

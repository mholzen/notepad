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
        getObjects: function() {
            return this.element.children('li').map(function(index, line) { return $(line).data('object'); } );      // TODO: refactor with container.getLines()
        },

        // Set up the widget
        _create : function() {
            this.element.addClass("notepad-column");

            // the predecessor container defines the list of subject URI for this column
            if (this.getContainer() === undefined) {
                throw "Cannot find a source container for this column";
            }

            var column = this;
            _.each( this.getContainer().getLines(), function(line) {
                var objectElement = $('<div>');
                line.element.append(objectElement);

                objectElement.object();
                objectElement.data('object').setPredicate(column.element);
            });
        },
        _destroy : function() {
            this.element.removeClass("notepad-container").removeAttr('about');
        },

    });

}(jQuery));

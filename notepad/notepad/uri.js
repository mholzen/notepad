(function($, undefined) {

    $.widget("notepad.uri", {
        // options: { 
        // },
        getUri: function() {
            return this.element.attr('about');
        },
        setUri: function(uri) {
            this.element.attr('about', uri);
        },
        // _create: function() {
        // },
        // _destroy : function() {
        // },
    });
}(jQuery));

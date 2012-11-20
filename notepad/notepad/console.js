(function($, undefined) {

function MyConsole() {
    this.mute = undefined;
    //this.solo = [];
}

MyConsole.prototype = {
    mute: function(matcher) {
        this.mute = matcher;
    },
    debug: function() {
        if (this.mute && this.mute.test(arguments[0])) {
            return false;
        }
        console.debug.apply(console, arguments);
    },
    log: function() {
        if (this.mute && this.mute.test(arguments[0])) {
            return false;
        }
        console.log.apply(console, arguments);
    }
};

//log = new MyConsole();

}(jQuery));

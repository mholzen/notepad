module("given a new line", {
    setup: function() {
        this.element = $('<p>').line();
        this.line = this.element.data('notepad.line');

        this.endpoint = mock(FusekiEndpoint);
        this.line.endpoint = this.endpoint;

    },
    teardown: function() {
        this.line.destroy();
    }
});

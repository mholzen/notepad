module("given a new object", {
    setup: function() {
        this.element = $("<p>").object();
        this.object = this.element.data('object');
    },
    teardown: function() {
        this.object.destroy();
    }
});
{
    test("when I provide text, it should provide a URI or a literal", function(){
        this.element.text("a human readable label");
        this.element.change();

        ok(this.object.getObjectUri() || this.object.getObjectLiteral(), "a URI or a literal is provided");
    });
    test("when I provide text with special characters, it should provide a URI or a literal", function(){
        this.element.text('a human readable label with special characters (: and ")');
        this.element.change();

        ok(this.object.getObjectUri() || this.object.getObjectLiteral(), "a URI or a literal is provided");
    });
    skippedTest("when I provide a URI, it should retrieve the resource and display an element of it", function(){
        this.element.text("http://www.google.com");
        this.element.change();            
        ok(false, "mock URL fetcher returns resource");
        ok(this.object.response, "last response is defined");
        ok(this.object.title, "title is defined");
    });
}

module("given mustache");
test("when I create a template", function() {
	var output = Mustache.render("my {{title}} spends {{calc}}", {title: "abc", calc: 123});
	equal(output, "my abc spends 123", "then substitons works");
});

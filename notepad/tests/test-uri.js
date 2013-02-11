QUnit.file = "test-uri.js";


module("given an empty element", {
    setup: function() {
    },
});
test("label", function() {

	var query = new Query($.notepad.templates.predicate_labels);

	var context = {"rdfs:label": "sen"};
    query.execute($.notepad.dev, context, function(triples) {
    	console.log(triples.toPrettyString());
    });
	assertThat(true);
});
test("when I create a new label", function() {

	e = $('<div>').appendTo("#fixture").endpoint({endpoint: $.notepad.dev});

	var query = new Query($.notepad.templates.predicate_labels);

	function triplesToLabelValue(triples) {
		return _.map(triples.triples(undefined, undefined, undefined), function(triple) {
			return {label: triple.object.toString(), value: triple};
		});
	}

	function searchPredicateLabels (request,callback) {
		var context = {'rdfs:label': request.term};
        query.execute(this.element.findEndpoint(), context, function(triples) {
        	callback(triplesToLabelValue(triples));
        });
	}

	function select(event, ui) {
        var value = ui.item.value;
        var widget = $(event.target).closest(':notepad-urilabel').data('notepadUrilabel');
        widget._setUri(value.subject);
        widget.update(toTriples(value));
        widget._trigger("urichange"); // adds widget prefix.
        event.preventDefault();  // prevent the default behaviour of replacing the text with the value.  update() has taken care of it
    }

	// e.urilabel();
	e.urilabel({
		autocompleteSource: searchPredicateLabels,
		autocompleteSelect: select,
		urichange: function() {
			console.log("change predicate uri");
		}});

	assertThat(true);
});
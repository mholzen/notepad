(function($, undefined) {

Expectation = function(triples) {
    this.triples = triples;
}

Expectation.prototype = {
	verify: function(dataset) {
		return dataset.execute(this.triples.literal(undefined, 'inst:test')); 	// could: remove undefined with variable argument length
	},
	update: function(dataset) {
		return dataset.execute(this.triples.literal(undefined, 'inst:update'));
	},
	verifyAndUpdate: function(dataset) {
		var expectation = this;
		return this.verify(dataset).done(function(response) {
			if (response.boolean) {
				return $.Deferred.resolveWith(true);
			}
			return expectation.update(dataset);
		});
	},
};

var expectations = toTriples(
    'notepad:app inst:expects inst:revLabel',
    'inst:revLabel inst:test "ask { { inst:revLabel a rdfs:property } UNION { ?s inst:revLabel ?o } }"^^sd:sparql',
        
    // could: retrieve from a file from template.js
    // 'inst:revLabel inst:update "DELETE { graph ?g { ?s notepad:inverseLabel ?o } } INSERT { graph ?g { ?s inst:revLabel ?o } } WHERE { graph ?g { ?s notepad:inverseLabel ?o } }"^^sd:sparql'
    'inst:revLabel inst:update "DELETE { ?s notepad:inverseLabel ?o } INSERT { ?s inst:revLabel ?o } WHERE { ?s notepad:inverseLabel ?o }"^^sd:sparql'
);

$.notepad.expectations = expectations;

}(jQuery));
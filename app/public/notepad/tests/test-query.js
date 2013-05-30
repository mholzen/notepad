
asyncTest("all", function() {
	var endpoint = new FusekiEndpoint("http://localhost:3030/private");

	var query = new Query ('construct {?s ?p ?o} where {?s ?p ?o filter not exists {?s a inst:Session}}');

	query.execute(endpoint, {}, function(all) {
		assertThat(all, hasSize(greaterThan(0)));
		console.log(all.pp());
		start();
	});
});

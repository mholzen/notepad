test("externalUri", function() {

	assertThat( $.notepad.externalUri('http://localhost'), not(truth())  );
	assertThat( $.notepad.externalUri('http://localhost:8080'), not(truth())  );
	assertThat( $.notepad.externalUri('http://instruct.vonholzen.org'), truth() );
	
});
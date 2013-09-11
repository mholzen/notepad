$(document).ready(function() {

    function functionThatThrows() {
        throw new Error("an expection");   // I can break on this point (when I set trynocatch=true and set debugger to break on all uncaught)
    }
    function anotherFunction() {
        // code
    }
    test("using hamcrest's matchers", function() {
        assertThat([2,3,4], hasItem(3));
        assertThat([2,3,4], not(hasItem(5)));
        assertThat([2,{a:3},4], hasItem(hasMember('a', equalTo(3))));
        assertThat([2,{a:3},4], not(hasItem(hasMember('a', equalTo(4)))));
        // We don't have the latest version of JsHamcrest

        assertThat(toResource(':b'), matches(/b/));
    });

    test("using matchTriple", function() {
        var triple = toTriple(':a', ':b', ':c');
        assertThat(triple, matchesTriple(':a', ':b', ':c'));
        assertThat(triple, matchesTriple(containsString('a'), ':b', ':c'));

        var triples = toTriples(triple, toTriple(':a', ':b', ':c2'));
        assertThat(triples, hasItem(matchesTriple(':a', ':b', matches(/c/) )));    
    });

    test("mock function", function() {
        var f = mockFunction();
        f();
        verify(f, once())();
    });

    var aMockFunction = mock(anotherFunction);
    skippedTest("debugger and framework combination", function() {
        // This error simply produces "died on test #1"
        //functionThatThrows();                                   // can break inside of this

        // setting the test config throwonfail to true, all the following with throw
        equal(1,2, "a test");                                   // test: break here when setting
        assertThat("1", equalTo("2"), "a test expression");     // test: break at this point by 
        verify(aMockFunction, times(5));                        // test: break here too

    });
    skippedTest("JsMockito verifier doesn't throw but uses QUnit.ok/fail instead", function() {
        expect(2);
        var mockLog = mock(console);
        mockLog.debug('hello');
        verify(mockLog, times(1)).debug();

        // Comment the following line to test that verify uses QUnit.ok
        mockLog.warn('hello'); 
        verify(mockLog, times(1)).warn();
    });

    skippedTest("pass a message when verifying interaction", function() {
        var mockLog = mock(console);
        mockLog.debug('hello');
        verify(mockLog, times(1), "called debug once").debug();
    });

});

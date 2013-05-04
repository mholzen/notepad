(function($, undefined) {

	// For tests, set the empty prefix to the Dev point
	$.notepad.namespaces[''] = 'http://localhost:3030/dev#';

    JsMockito.Integration.QUnit();
    JsHamcrest.Integration.QUnit(); 

}(jQuery));

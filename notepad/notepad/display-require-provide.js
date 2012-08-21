function wrapSecondLineInTable() {
	if (! $("td").length ) {
		$("ul:eq(1)").wrap("<table><tr><td>");
	}
}

function insertBefore() {
	wrapSecondLineInTable();
	var td = $('<td> <ul class="notepad-container"/> </td>').insertBefore("td:first");
	var ul = td.find("ul");
	ul.container();
	ul.data('container').appendLine()
}

function insertAfter() {
	wrapSecondLineInTable();
	var td = $('<td> <ul class="notepad-container"/> </td>').insertAfter("td:last");
	var ul = td.find("ul");
	ul.container();
	ul.data('container').appendLine()
}
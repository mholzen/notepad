$(function() {
	ac = $(".notepad-object").data('autocomplete');
});

function foo() {

	ac = $(".notepad-object").data('autocomplete');
	ac.search("Patr");



	$("#ui-menu-1").css("left","130px");



	ac.search("Pro");



	$("#ui-menu-1").css("left","280px");




	// click date picker
	$("#ui-datepicker-div").css({top: "106px", left: "380px"})
}
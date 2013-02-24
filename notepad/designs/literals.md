Displaying Literals and URI, and autocomplete
=============================================

Literals
--------

	<div about=":s">
		<div rel=":p">
			<div>literal</div>

OR

	<div about=":s">
		<div rel=":p">literal</div>


When the literal is in a context that accepts URIs,
and the literal is xsd:string (because that's the receiving end of rdfs:label)
then autocomplete on the xsd:string can be turned on

=> literals that are xsd:strings


URIs
----

	<div about=":s">
		<div rel=":p">
			<div about=":o">
				<div rel="rdfs:label">

			</div>

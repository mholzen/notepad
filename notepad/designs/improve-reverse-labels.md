- predicate.setUri

		calls urilabel.setUri


- urilabel.setUri

		query templates


- receive template

		calls urilabel.query
		// urilabel.query should be describePredicate ( uri )


- describePredicate ( predicate )

		CONSTRUCT {
			?predicate rdfs:label ?label
			?predicate n:revLabel ?revLabel
			?predicate n:subject ?sX
			?sX ?pX ?
		} WHERE {
			?predicate rdfs:label ?label .
			?predicate n:revLabel ?revLabel .
			?sX ?pX ?oX .
			?pX rdfs:subProperty ?predicate
			?oX rdfs:label ?oLabel .
			?sX rdfs:label ?sLabel .
		}

- receive turtle

		// - with rdfs:label
		:p rdfs:label "label"


		// - with rdfs:revLabel
		:p notepad:revLabel "label" .
		:p notepad:subject :s .
		:s :p :o .

		:p notepad:subject :s1 .
		:s1 :p :o1 .

		:p rdf:meta :p-meta


- urilabel.template should be:

		{{#rdfs:label}}
			<div class="notepad-literal notepad-predicate" rel="rdfs:label">{{xsd:string}}</div>
		{{/rdfs:label}}

		{{#notepad:inverseLabel}}
			<span class="tooltip">
				<div class="item notepad-literal" rel="rdfs:label">related to</div>
				<div class="content">
					<h1>Reverse of:
						<span class="predicate-label" rel="notepad:inverseLabel">{{notepad:inverseLabel}}</span>
					</h1>
					<h2>As in:</h2>
					<ul about="{{{notepad:subject}}}" class="notepad-container"/>
				</div>
			</span>
		{{/notepad:inverseLabel}}


- urilabel.DOM should be

		<div class="notepad-literal notepad-predicate" rel="rdfs:label">created</div>
		<span class="tooltip">
			<div class="item notepad-literal" rel="rdfs:label">related to</div>
			<span class="content">Reverse of: <span class="predicate-label" rel="notepad:inverseLabel">created</span></span>
			<div  class="content">
				<ul about="notepad:subject" class="notepad-container"reated</span></p>
				<p>Reverse of: <span class="predicate-label" rel="notepad:inverseLabel">created</span></p>
			</div>
		<span>



- urilabel final DOM should be

		// - with rdfs:label 
			<div class="notepad-literal notepad-predicate" rel="rdfs:label">created</div>

		// - with rdfs:revLabel
			<span class="tooltip">
				<div class="item notepad-literal" rel="rel:rdfs:label">related to</div>
				<div class="content">
					<h1>Reverse of: <span class="predicate-label" rel="notepad:inverseLabel">creator of</span></h1>
					<h2>As in:</h2>
					<!-- a urilabel -->
					<div class="notepad-urilabel" about="http://google.com" rel="rdfs:label"><span class="value">Google</span>
						<ul>
							<li rel=":creator-of">Google Keep</li>
						</ul>
					</div>					
				</div>
			</span>
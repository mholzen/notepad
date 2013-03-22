Convert a literal to a graph
============================

let's say that we have a long literal.  The process of tagging requires marking parts that are predicate label.

For example:  this is the predicate label.

It requires:

a - mark up a literal with XML, identify a subset of the literal, by 



# Discover an existing label
## start with a literal, no label

	<div class="predicate literal" rel="rdfs:member">For example:  this is the predicate label.</div>

## add a label

	<div class="urilabel literal" about="rdfs:member" rel="rdfs:label">member</div>
	<div class="predicate literal" rel="rdfs:member">For example:  this is the predicate label.</div>


## Consume the label from the literal

	<div class="urilabel literal" about="notepad:eg" rel="rdfs:label">For example</div>
	<div class="predicate literal" rel="notepad:eg">this is the predicate label.</div>


# Set a new URI for a new relationship

## start with a literal, no label

	<div class="predicate literal" rel="rdfs:member">Program Manager: Jon Doe</div>

## consume the label

	<div class="urilabel literal" about="_:new" rel="rdfs:label">Program manager</div>
	<div class="predicate literal" rel="_:new">Jon Doe</div>


model
	FusekiEndpoint
	Triples
	X.execute


view (endpoint widget)
	FusekiEndpointView

should:
view.create ( with model )

should get model reprensetation
view.element.text().contains( model parts )

should set model parts
view.element.text('string parts of model')


should return model:
view.getModel()

	question:
	which takes precedence?
	the element, then then
		this.element.find('[rel="sd:dataset"]').text()
		options.dataset
		options.endpoint.dataset

// Override View.remove()'s default behavior
Backbone.View = Backbone.View.extend({

	remove: function() {
		// Empty the element and remove it from the DOM while preserving events
		$(this.el).empty().detach();

		return this;
	},
	dispose: function() {
    
    // same as this.$el.remove();
    this.remove();

    // unbind events that are
    // set on this view
    this.off();

    // remove all models bindings
    // made by this view
    this.model.off( null, null, this );

	},
	close: function(){
		this.remove();
		this.unbind();
		if (this.onClose){
			this.onClose();
		}
	}

});
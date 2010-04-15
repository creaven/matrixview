/*
---
 
name: MatrixView
description: Class to select items in matrix view. Port of prototype MatrixView.
license: MIT-Style License (http://mifjs.net/license.txt)
copyright: Anton Samoylov (http://mifjs.net)
authors: Anton Samoylov (http://mifjs.net)
requires: core:1.2.4:*
provides: MatrixView
 
...
*/

var MatrixView = new Class({

	Implements: [Events, Options],

	initialize: function(element, options) {
		this.selectedItems = [];
		this.element = document.id(element);
		this.selectionArea = new Element('div', {
			'class': 'selectionArea'
		}).inject(this.element);
		this.events();
	},

	bound: function() {
		Array.each(arguments, function(item) {
			this.bound[item] = this[item].bind(this);
		},
		this);
	},

	events: function() {
		this.bound('keypress', 'dblclick', 'mousedown', 'mouseup', 'mousemove');
		this.element.addEvents({
			dblclick: this.bound.dblclick,
			mousedown: this.bound.mousedown,
			mouseup: this.bound.mouseup,
			mousemove: this.bound.mousemove
		});
		document.addEvent('keypress', this.bound.keypress);

	},

	keypress: function(event) {
		if (event.meta && (event.keyCode == 97 || event.keyCode == 65)) {
			this.selectAll();
			event.stop();
			return null;
		} else if (event.shift) {
			if (['left', 'right', 'top', 'bottom'].contains(event.key)) {
				this['expandSelection' + event.key.capitalize()](event);
			}
			if (event.key == 'space') {
				event.stop();
			}
			if (event.key == 'tab' && this.selectedItems.length) {
				this.moveLeft(event);
			}
			return null;
		}

		if (event.key == 'enter') {
			if (this.selectedItems.length == 1) {
				this.open(this.selectedItems[0]);
			}
		}
		if (['delete', 'backspace'].contains(event.key)) {
			this.destroy(this.selectedItems);
			event.stop();
		}
		if (['left', 'right', 'down', 'up'].contains(event.key)) {
			this['move' + event.key.capitalize()](event);
		}
		if (event.key == 'space') {
			event.stop();
		}
		if (event.key == 'tab' && this.selectedItems.length) {
			this.moveRigth(event);
		}
		return null;
	},

	dblclick: function(event) {
		event.preventDefault();
		var target = document.id(event.target);
		var element = target.getAncestor('li');
		if (!element) return;
		this.deselectAll();
		this.open(element);
	},

	mousedown: function(event) {
		event.preventDefault();
		var element = document.id(event.target);
		// For Safari, since it passes thru clicks on the scrollbar, exclude 15 pixels from the click area
		if (Browser.Engine.webkit && this.element.scrollHeight > this.element.offsetHeight && event.page.x > (this.element.offsetWidth + this.element.getPosition().x - 15)) {
			event.stop();
			return;
		};
		element = element.getAncestor('li');
		if (element) {
			this.select(element, event);
		} else {
			this.deselectAll();
		};
		this.dragging = true;
		this.originX = event.page.x;
		this.originY = event.page.y;
		this.element.setStyle({
			width: 0,
			height: 0,
			left: event.page.x - this.element.getPosition().x,
			top: event.page.y - this.element.getPosition().y
		});
	},

	mouseup: function(event) {
		event.stop();
		this.dragging = false;
		this.selectionArea.setStyle({
			width: 0,
			height: 0,
			display: 'none'
		});
		this.fireEvent('select', this.selectedItems);
	},

	mousemove: function(event) {
		if (!this.dragging) return;
		this.selectionArea.setStyle('display', 'block');
		var top, left;
		var width = event.page.x - this.originX;
		var height = event.page.y - this.originY;

		if (width < 0) {
			width = -width;
			left = event.page.x;
		} else {
			left = this.originX;
		}
		if (height < 0) {
			height = -height;
			top = event.page.y;
		} else {
			top = this.originY;
		}
		left = left - this.element.getPosition().x;
		top = top - this.element.getPosition().y;

		this.selectionArea.setStyle({
			left: left,
			top: top,
			width: width,
			height: height
		});

		this.element.getElements('li').each(function(element) {
			var coords = element.getCoordinates();
			var left = coords.left;
			var top = coords.top;
			var right = coords.right;
			var bottom = coords.bottom;
			if (
			Position.within($('selectionArea'), left, top) || Position.within($('selectionArea'), right, top) || Position.within($('selectionArea'), left, bottom) || Position.within($('selectionArea'), right, bottom)) {
				element.addClass('selected');
				if (window.matrixView.selectedItems.indexOf(element) == -1) {
					this.selectedItems.push(element);
				}
			} else {
				this.selectedItems[this.selectedItems.indexOf(element)] = null;
				element.removeClass('selected');
			}
		});
	},

	deselectAll: function() {
		this.element.getElements('li.selected').removeClass('selected');
		this.selectedItems = [];
		this.fireEvent('deselect');
	},

	select: function(element, event) {
		// Multiple Selection (Shift-Select)
		if (event && event.shiftKey) {
			// Find first selected item
			var firstSelectedElement = this.element.getElement('li.selected');
			var firstSelectedElementIndex = this.items().indexOf(firstSelectedElement);
			var selectedElementIndex = this.items().indexOf(element);

			if (firstSelectedElement == element) return;

			// If no elements are selected already, just select the element that
			// was clicked on.
			if (firstSelectedElementIndex == -1) {
				this.select(element);
				return;
			}

			var siblings;
			if (firstSelectedElementIndex < selectedElementIndex) {
				siblings = firstSelectedElement.nextSiblings();
			} else {
				siblings = firstSelectedElement.previousSiblings();
			}
			var done = false;
			siblings.each(function(el) {
				if (done == false) {
					el.addClassName('selected');
					this.selectedItems.push(el);
				}
				if (element == el) done = true;
			});
		}

		// Multiple Selection (Meta-Select)
		else if (event && event.metaKey) {
			// If the element is already selected, deselect it
			if (element.hasClassName('selected')) {
				this.selectedItems[this.selectedItems.indexOf(element)] = null;
				element.removeClass('selected');
			}

			// Otherwise, select it
			else {
				this.selectedItems.push(element);
				element.addClass('selected');
			}
		} else {
			this.element.getElements('li.selected').removeClass('selected');
			this.selectedItems = [element];
			element.addClass('selected');
		}
		this.fireEvent('select', [element]);
	},

	open: function(element) {
		this.deselectAll();
		element.addClassName('selected');
		this.fireEvent('open', [element]);
	},

	destroy: function(elements) {
		this.fireEvent('delete', [elements]);
	},

	selectAll: function() {
		this.deselectAll();
		this.element.getElements('li').each(function(el) {
			el.addClassName('selected');
			this.selectedItems.push(el);
		});
		this.fireEvent('select', this.selectedItems);
	},

	selectFirst: function() {
		var element = this.element.getFirst('li');
		this.deselectAll();
		this.select(element);
		this.scrollIntoView(element, 'down');
		this.fireEvent('select', [element]);
	},

	selectLast: function() {
		var element = $$('#matrixView li').last();
		this.deselectAll();
		this.select(element);
		this.scrollIntoView(element, 'down');
		this.fireEvent('select', [element]);
	},

	moveLeft: function(event) {
		event.stop();
		var element = this.element.getElement('li.selected');
		if (!element) return this.selectFirst();
		var previousElement = element.getPrevious();
		if (previousElement) {
			this.select(previousElement);
			this.scrollIntoView(previousElement, 'up');
		} else {
			this.selectFirst();
		}
		return null;
	},

	moveRight: function(event) {
		event.stop();
		var element = this.element.getElement('li.selected:last-child');
		if (!element) {
			return this.selectFirst();
		}
		var next = element.getNext();
		if (next) {
			this.select(next);
			this.scrollIntoView(next, 'down');
		} else {
			this.selectLast();
		}
		return null;
	},

	moveUp: function(event) {
		event.stop();
		var element = this.element.getElement('li.selected');
		if (!element) return this.selectFirst();
		var offset = element.getPosition();
		var y = Math.floor(offset.y - element.offsetHeight);

		var previous = element.getAllPrevious();
		if (!previous.length) return this.selectFirst();

		previous.each(function(el) {
			if (Position.within(el, offset.x, y)) {
				this.select(el);
				this.scrollIntoView(el, 'up');
			}
		});
		return null;
	},

	moveDown: function(event) {
		event.stop();
		var element = this.element.getElement('li.selected:last-child');
		if (!element) return this.selectFirst();
		var offset = element.getPosition();
		var y = Math.floor(offset.y + element.offsetHeight + (element.offsetHeight / 2)) + parseInt(element.getStyle('margin-bottom'), 10);

		var next = element.getAllNext();
		if (!next) return this.selectLast();
		var selected = false;
		next.each(function(el) {
			if (Position.within(el, offset[0], y)) {
				this.select(el);
				this.scrollIntoView(el, 'down');
				selected = true;
			}
		});
		if (!selected) this.selectLast();
		return null;
	},

	expandSelectionLeft: function(event) {
		var element = this.element.getElement('li.selected');
		var otherElement = element.getPrevious().addClass('selected');
		this.selectedItems.push(otherElement);
		this.scrollIntoView(element, 'up');
		this.fireEvent('select', [element]);
	},

	expandSelectionRight: function(event) {
		var element = this.element.getElement('li.selected');
		var otherElement = element.getNext().addClass('selected');
		this.selectedItems.push(otherElement);
		this.scrollIntoView(element, 'down');
		this.fireEvent('select', [element]);
	},

	expandSelectionUp: function(event) {
		event.stop();
		var element = this.element.down('li.selected');
		var itemWidth = element.getWidth();
		var itemOffset = Position.cumulativeOffset(element);
		var done = false;
		element.getAllPrevious().each(function(el) {
			if (done == false) {
				el.addClass('selected');
				this.selectedItems.push(el);
			}
			if (Position.within(el, itemOffset.x, itemOffset.y - element.offsetHeight)) {
				done = true;
				this.scrollIntoView(el, 'up');
			}
		});
		this.fireEvent('select', [element]);
	},

	expandSelectionDown: function(event) {
		event.stop();
		var element = this.element.getElement('li.selected:last-child');
		var offset = element.getPosition();
		var y = Math.floor(offset.y + element.offsetHeight + (element.offsetHeight / 2)) + parseInt(element.getStyle('margin-bottom'), 10);
		var done = false;
		element.getAllNext.each(function(el) {
			if (done == false) {
				el.addClass('selected');
				this.selectedItems.push(el);
			}
			if (Position.within(el, offset.x, y)) {
				done = true;
				this.scrollIntoView(el, 'down');
			}
		});
		this.fireEvent('select', [element]);
	},

	items: function() {
		return this.element.getChildren('li');
	},

	scrollIntoView: function(element, direction) {
		var scrollingView = this.element;
		if (direction == 'down' || direction == 'right') {
			if (((Position.page(element)[1] + element.offsetHeight) >= (this.element.offsetHeight + this.element.getPosition().y)) || (Position.page(element)[1] <= 0)) {
				this.element.scrollTop = element.getPosition().y - this.element.offsetHeight + element.offsetHeight;
			}
		} else if (direction == 'up' || direction == 'left') {
			if (((Position.page(element)[1] + element.getHeight()) >= (scrollingView.getHeight() + Position.cumulativeOffset(scrollingView)[1])) || (Position.page(element)[1] <= 0)) {
				this.element.scrollTop = element.getPosition().y - parseInt(element.getStyle('margin-top'), 10) - 24;
			}
		}
	}

});

Element.implement({

	getAncestor: function(match, top) { //includes self
		var parent = this;
		while (parent) {
			if (parent.match(match)) return parent;
			parent = parent.getParent();
			if (parent == top) return false;
		}
		return false;
	}

});

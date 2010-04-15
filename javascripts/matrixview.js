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
		element = element.getAncestor('li');
		if (element) {
			this.select(element, event);
		} else {
			this.deselectAll();
		};
		this.dragging = true;
		this.start = event.page;
		this.selectionArea.setStyles({
			width: 0,
			height: 0,
			left: event.page.x - this.element.getPosition().x,
			top: event.page.y - this.element.getPosition().y
		});
	},

	mouseup: function(event) {
		event.stop();
		this.dragging = false;
		this.selectionArea.setStyles({
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
		var width = event.page.x - this.start.x;
		var height = event.page.y - this.start.y;

		if (width < 0) {
			width = -width;
			left = event.page.x;
		} else {
			left = this.start.x;
		}
		if (height < 0) {
			height = -height;
			top = event.page.y;
		} else {
			top = this.start.y;
		}
		left = left - this.element.getPosition().x;
		top = top - this.element.getPosition().y;
		var right = left + width;
		var bottom = top + height;
		this.selectionArea.setStyles({
			left: left,
			top: top,
			width: width,
			height: height
		});
		function intersect(a, b, flag){
			var sides = [[0, 1, 0, 3], [0, 1, 2, 1], [0, 3, 2, 3], [2, 1, 2, 3]];
			for(var i = 0; i < 4; i++){
				var side = sides[i];
				var x1 = a[side[0]];
				var y1 = a[side[1]];
				var x2 = a[side[2]];
				var y2 = a[side[3]];
				var left = b[0];
				var top = b[1];
				var right = b[2];
				var bottom = b[3];
				if( left <= x1 && x1 <= right && top <= y1 && y1 <= bottom ) return true;
				if( left <= x2 && x2 <= right && top <= y2 && y2 <= bottom ) return true;
				if( x1 <= left && x2 >= left && top <= y2 && y2 <= bottom) return true;
				if( y1 <= top && y2 >= top && left <= x2 && x2 <= right) return true;
			}
			if(flag) return false;
			return intersect(b, a, true);
		}
		this.element.getElements('li').each(function(element) {
			var coords = element.getCoordinates();
			if (intersect([left, top, right, bottom], [coords.left, coords.top, coords.right, coords.bottom])){
				element.addClass('selected');
				this.selectedItems.include(element);
			} else {
				this.selectedItems.erase(element);
				element.removeClass('selected');
			}
		}, this);
	},

	select: function(element, event) {
		if (event && event.shift) {
			// Find first selected item
			var items = this.getItems();
			var first = this.element.getElement('li.selected');
			if (first == element) return;
			first = items.indexOf(first);
			var current = items.indexOf(element);
			if (first == -1) {
				this.select(element);
				return;
			};
			var start, end;
			if(first < current){
				start = first;
				end = current + 1;
			}else{
				start = current;
				end = first;
			}
			for(var i = start; i < end; i++){
				items[i].addClass('selected');
				this.selectedItems.push(items[i]);
			}
		} else if (event && event.meta) {
			if (element.hasClass('selected')) {
				this.selectedItems.erase(element);
				element.removeClass('selected');
			} else {
				this.selectedItems.push(element);
				element.addClass('selected');
			}
		} else {
			if(element.hasClass('selected')) return;
			this.element.getElements('li.selected').removeClass('selected');
			this.selectedItems = [element];
			element.addClass('selected');
		}
		this.fireEvent('select', [element]);
	},

	open: function(element) {
		this.deselectAll();
		element.addClass('selected');
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
	
	deselectAll: function() {
		this.element.getElements('li.selected').removeClass('selected');
		this.selectedItems = [];
		this.fireEvent('deselect');
	},

	selectFirst: function() {
		var element = this.element.getFirst('li');
		this.deselectAll();
		this.select(element);
		this.scrollIntoView(element, 'down');
		this.fireEvent('select', [element]);
	},

	selectLast: function() {
		var element = this.element.getElement('li:list-child');
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

	getItems: function() {
		return this.element.getElements('li');
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

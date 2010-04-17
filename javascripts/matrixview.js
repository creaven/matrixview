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
		this.bound('keypress', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'stopSelection');
		this.element.addEvents({
			dblclick: this.bound.dblclick,
			mousedown: this.bound.mousedown
		});
		document.addEvents({
			mouseup: this.bound.mouseup,
			mousemove: this.bound.mousemove
		});
		var keypress = (Browser.Engine.trident || Browser.Engine.webkit) ? 'keydown' : 'keypress';
		document.addEvent(keypress, this.bound.keypress);
	},
	
	stopSelection: function(event){
		event.preventDefault();
	},

	keypress: function(event) {
		if (event.meta && (event.keyCode == 97 || event.keyCode == 65)) {
			this.selectAll();
			event.preventDefault();
			return null;
		} else if (event.shift) {
			if (['left', 'right', 'top', 'bottom'].contains(event.key)) {
				this['expandSelection' + event.key.capitalize()](event);
			}
			if (event.key == 'space') {
				event.preventDefault();
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
			event.preventDefault();
		}
		if (['left', 'right', 'down', 'up'].contains(event.key)) {
			this['move' + event.key.capitalize()](event);
		}
		if (event.key == 'space') {
			event.preventDefault();
		}
		if (event.key == 'tab' && this.selectedItems.length) {
			this.moveRight(event);
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
		window.focus();
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
		document.addEvent('selectstart', this.bound.stopSelection);
	},

	mouseup: function(event) {
		this.dragging = false;
		this.selectionArea.setStyles({
			width: 0,
			height: 0,
			display: 'none'
		});
		document.removeEvent('selectstart', this.bound.stopSelection);
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
		function intersect(a, b){
			var left = Math.max(a.left, b.left);
			var right = Math.min(a.right, b.right);
			var top = Math.max(a.top, b.top);
			var bottom = Math.min(a.bottom, b.bottom);
			return left <= right && top <= bottom ? true : false;
		};
		this.element.getElements('li').each(function(element) {
			var coords = element.getCoordinates();
			coords.top += this.element.scrollTop;
			coords.bottom += this.element.scrollTop;
			if (intersect(coords, {left: left, right: right, top: top, bottom: bottom})){
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
		var element = this.element.getElement('li');
		this.deselectAll();
		this.select(element);
		this.scrollIntoView(element, 'down');
		this.fireEvent('select', [element]);
	},

	selectLast: function() {
		var element = this.element.getElement('li:last-child');
		this.deselectAll();
		this.select(element);
		this.scrollIntoView(element, 'down');
		this.fireEvent('select', [element]);
	},

	moveLeft: function(event) {
		event.preventDefault();
		var element = this.element.getElements('li.selected').getLast();
		if (!element) return this.selectLast();
		var previousElement = element.getPrevious();
		if (previousElement) {
			this.select(previousElement);
			this.scrollIntoView(previousElement, 'up');
		}
		return null;
	},

	moveRight: function(event) {
		event.preventDefault();
		var element = this.element.getElement('li.selected');
		if (!element) return this.selectFirst();
		var next = element.getNext();
		if (next) {
			this.select(next);
			this.scrollIntoView(next, 'down');
		}
		return null;
	},

	moveUp: function(event) {
		event.preventDefault();
		var element = this.element.getElement('li.selected');
		if (!element) return this.selectLast();
		var offset = element.getPosition();
		var y = Math.floor(offset.y - element.offsetHeight);
		
		function inside(element, x, y){
			var coords = element.getCoordinates();
			return (coords.left <= x && x <= coords.right && coords.top <= y && y <= coords.bottom) ? true : false;
		};
		var previous = element.getPrevious();
		while(previous){
			if(inside(previous, offset.x, y)){
				this.select(previous);
				this.scrollIntoView(previous);
				break;
			}
			previous = previous.getPrevious();
		};
		return null;
	},

	moveDown: function(event) {
		event.preventDefault();
		var element = this.element.getElements('li.selected').getLast();
		if (!element) return this.selectFirst();
		var offset = element.getPosition();
		var y = Math.floor(offset.y + element.offsetHeight + (element.offsetHeight / 2)) + parseInt(element.getStyle('margin-bottom'), 10);

		function inside(element, x, y){
			var coords = element.getCoordinates();
			return (coords.left <= x && x <= coords.right && coords.top <= y && y <= coords.bottom) ? true : false;
		};
		var next = element.getNext();
		while(next){
			if(inside(next, offset.x, y)){
				this.select(next);
				this.scrollIntoView(next);
				break;
			}
			next = next.getNext();
		};
		return null;
	},

	expandSelectionLeft: function(event) {
		var element = this.element.getElement('li.selected');
		var previous = element.getPrevious();
		if(!previous) return;
		previous.addClass('selected');
		this.selectedItems.push(previous);
		this.scrollIntoView(element);
		this.fireEvent('select', [element]);
	},

	expandSelectionRight: function(event) {
		var element = this.element.getElements('li.selected').getLast();
		var next = element.getNext();
		if(!next) return;
		next.addClass('selected');
		this.selectedItems.push(next);
		this.scrollIntoView(element);
		this.fireEvent('select', [element]);
	},

	expandSelectionUp: function(event) {
		event.preventDefault();
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
		event.preventDefault();
		var element = this.element.getElement('li.selected:last-child');
		var offset = element.getPosition();
		var y = Math.floor(offset.y + element.offsetHeight + (element.offsetHeight / 2)) + parseInt(element.getStyle('margin-bottom'), 10);
		var done = false;
		element.getAllNext().each(function(el) {
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

	scrollIntoView: function(element) {
		var top = element.offsetTop;
		var bottom = top + element.offsetHeight;
		if(top - this.element.scrollTop < 0) {
			this.element.scrollTop = top;
		} else if(this.element.scrollTop + this.element.offsetHeight - bottom < 0){
			this.element.scrollTop = bottom - this.element.offsetHeight;
		}
		
		var left = element.offsetLeft;
		var right = left + element.offsetWidth;
		if(left - this.element.scrollLeft < 0) {
			this.element.scrollLeft = left;
		} else if(this.element.scrollLeft + this.element.offsetWidth - right < 0){
			this.element.scrollLeft = right - this.element.offsetWidth;
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

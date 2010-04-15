//
// MatrixView 1.1.0-dev
//
// For more information on this library, please see http://www.matrixview.org/.
//
// Copyright (c) 2007-2008 Justin Mecham <justin@aspect.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

var MatrixView = new Class({
	
	Implements: [Events, Options],
	
/*
  	// The Attached Element
	element: null,

	// Handlers
	selectHandler: null,
	deselectHandler: null,
	openHandler: null,
	deleteHandler: null,

	// Selected Items
	selectedItems: null,
*/
	initialize: function(element, options){		
    	this.selectedItems   = [];
    	this.element = document.id(element);
		this.selectionArea = new Element('div', {'class': 'selectionArea'}).inject(this.element);

    	// Observe keys
    	document.addEvent('keypress', function(event) {
        	// Meta/Control
			if (event.meta && (event.keyCode == 97 || event.keyCode == 65)){
				window.matrixView.selectAll();
				event.stop();
				return false;
			} else if (event.shift) {
				var directions = ['left', 'right', 'top', 'bottom'];
				if(['left', 'right', 'top', 'bottom'].contains(event.key)){
					this['expandSelection' + event.key.capitalize()](event);
				}
				if(event.key == 'space'){
					event.stop();
				}
				if(event.key == 'tab' && this.selectedItems.length){
					this.moveLeft(event);
				}
          		return;
        	}

			if (event.key == 'enter') {
				if (this.selectedItems.length == 1)
				this.open(this.selectedItems[0]);
			}
			if (['delete', 'backspace'].contains(event.key)) {
				this.destroy(this.selectedItems);
				event.stop();
			}
			if(['left', 'right', 'down', 'up'].contains(event.key)){
				this['move' + event.key.capitalize()](event);
			}
			if(event.key == 'space'){
				event.stop();
			}
			if(event.key == 'tab' && this.selectedItems.length){
				this.moveRigth(event);
			}
		});

		this.element.addEvent('dblclick', function(event) {
			event.preventDefault();
			var target = document.id(event.target);
			var element = target.getAncestor('li');
			if (element) {
				this.deselectAll();
				this.open(element);
			}
		}.bind(this));

	    element.addEvent('mousedown', function(event) {
			event.preventDefault();
			var element = document.id(event.target);
			// For Safari, since it passes thru clicks on the scrollbar, exclude 15 pixels from the click area
			if (Browser.Engine.webkit) {
				if (window.matrixView.element.scrollHeight > window.matrixView.element.getHeight()) {
					if (Event.pointerX(event) > (window.matrixView.element.getWidth() + Position.cumulativeOffset(window.matrixView.element)[0] - 15)) {
						event.stop();
						return;
					}
				}
			}
			element = element.getAncestor('li');
			if (element) {
				this.select(element, event);
			} else {
				this.deselectAll();
			}
			this.dragging = true;
			this.originX = event.page.x;
			this.originY = event.page.y;
			this.element.setStyle({
				width:0, 
				height: 0,
				left:event.pointerX() - window.matrixView.element.cumulativeOffset()[0],
				top:event.pointerY() - window.matrixView.element.cumulativeOffset()[1]
			});
		}.bind(this));

		element.addEvent('mouseup', function(event) {
			event.stop();
			this.dragging = false
			this.selectionArea.setStyle({
				width: 0, 
				height: 0,
				display: 'none'
			});
			this.fireEvent('select', this.selectedItems);
		}.bind(this));

		element.addEvent('mousemove', function(event) {
			if(!this.dragging) return;
			this.selectionArea.setStyle('display', 'block');
			var top, left;
			var width  = event.page.x - this.originX;
			var height = event.page.y - this.originY;

			if (width < 0){
				width = -width;
				left = event.page.x;
			} else {
				left = this.originX;
			}
			if (height < 0){
				height = -height;
				top = event.page.y;
			}else{
				top = this.originY;
			}
			left = left - window.matrixView.element.cumulativeOffset()[0];
			top  = top  - window.matrixView.element.cumulativeOffset()[1];

			this.selectionArea.setStyle({
				left: left,
				top: top,
				width: width,
				height: height
			});

			this.element.getElements('li').each(function(element){
				var coords = element.getCoordinates();
				var left = coords.left;
				var top = coords.top;
				var right = coords.right;
				var bottom = coords.bottom;
				if (
					Position.within($('selectionArea'), left, top) ||
					Position.within($('selectionArea'), right, top) ||
					Position.within($('selectionArea'), left, bottom) ||
					Position.within($('selectionArea'), right, bottom)
				){
					element.addClass('selected');
					if (window.matrixView.selectedItems.indexOf(element) == -1){
						this.selectedItems.push(element);
					}
				} else {
					this.selectedItems[this.selectedItems.indexOf(element)] = null
					element.removeClass('selected');
				}
			});
		});
	},

	deselectAll: function() {
		this.element.getElements('li.selected').removeClass('selected');
		this.selectedItems = [];
		this.fireEvent('deselect');
	},

	select: function(element, event){
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
      if (firstSelectedElementIndex < selectedElementIndex){
		siblings = firstSelectedElement.nextSiblings();
      }else{
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
    else if (event && event.metaKey)
    {
      // If the element is already selected, deselect it
      if (element.hasClassName('selected'))
      {
        this.selectedItems[this.selectedItems.indexOf(element)] = null
        element.removeClassName('selected')
      }

      // Otherwise, select it
      else
      {
        this.selectedItems.push(element)
        element.addClassName('selected')
      }
    }else{
		this.element.getElements('li.selected').removeClass('selected');
		this.selectedItems = new Array(element)
		element.addClassName('selected')
    }
	this.fireEvent('select', [element]);
  },

	open: function(element) {
		this.deselectAll();
		element.addClassName('selected');
		this.fireEvent('open', [element]);
	},

	destroy: function(elements){
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
		element = $$('li.selected').first()
		if (!element)
		return this.selectFirst()
		if (previousElement = element.previous())
		{
		this.select(previousElement)
		this.scrollIntoView(previousElement, 'up')
		}
		else
		this.selectFirst()
	},

	moveRight: function(event){
		event.stop();
		var element = this.element.getElement('li.selected:last-child');
		if (!element){
			return this.selectFirst();
		}
		var next = element.getNext();
		if (next) {
			this.select(next);
			this.scrollIntoView(next, 'down');
		}else{
			this.selectLast();
		}
	},

	moveUp: function(event){
		event.stop()
		var element = this.element.getElement('li.selected');
		if (!element) return this.selectFirst();
		var offset = element.getPosition();
		var y = Math.floor(offset.y - element.offsetHeight);

		var previous = element.getAllPrevious();
		if (!previous.length) return this.selectFirst();

		previous.each(function(el) {
			if (Position.within(el, offset.x, y)){
				this.select(el)	
				this.scrollIntoView(el, 'up')
			}
		});

	},

	moveDown: function(event){
		event.stop()
		var element = this.element.getElement('li.selected:last-child');
		if (!element) return this.selectFirst();
		var offset = element.getPosition();
		var y = Math.floor(offset.y + element.offsetHeight + (element.offsetHeight / 2)) + parseInt(element.getStyle('margin-bottom'))

		var next = element.getAllNext();
		if (!next) return this.selectLast();
		var selected = false;
		next.each(function(el) {
			if (Position.within(el, offset[0], y)){
				this.select(el);
				this.scrollIntoView(el, 'down');
				selected = true;
			}
		});
		if (!selected) this.selectLast();
	},

	expandSelectionLeft: function(event){
		var element = this.element.getElement('li.selected');
		var otherElement = element.getPrevious().addClass('selected');
		this.selectedItems.push(otherElement);
		this.scrollIntoView(element, 'up');
		this.fireEvent('select', [element]);
	},

	expandSelectionRight: function(event){
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
		element.getAllPrevious().each(function(el){
			if (done == false){
				el.addClass('selected');
				this.selectedItems.push(el);
			}
			if (Position.within(el, itemOffset.x, itemOffset.y - element.offsetHeight)){
				done = true;
				this.scrollIntoView(el, 'up');
			}
		});
		this.fireEvent('select', [element]);
	},

	expandSelectionDown: function(event){
		event.stop();
		var element = this.element.getElement('li.selected:last-child');
		var offset = element.getPosition();
		var y = Math.floor(offset.y + element.offsetHeight + (element.offsetHeight / 2)) + parseInt(element.getStyle('margin-bottom'));
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
		return this.element.getElements('li');
	},
	
	scrollIntoView: function(element, direction) {
		scrollingView = this.element;
		if (direction == 'down' || direction == 'right') {
			if ((Position.page(element)[1] + element.getHeight()) >= (scrollingView.getHeight() + Position.cumulativeOffset(scrollingView)[1])){
				scrollingView.scrollTop = (Position.cumulativeOffset(element)[1] - scrollingView.getHeight() + element.getHeight());
			} else if (Position.page(element)[1] <= 0) {
				scrollingView.scrollTop = (Position.cumulativeOffset(element)[1] - scrollingView.getHeight() + element.getHeight())
			} else if (direction == 'up' || direction == 'left') {
				if ((Position.page(element)[1] + element.getHeight()) >= (scrollingView.getHeight() + Position.cumulativeOffset(scrollingView)[1])){
					scrollingView.scrollTop = element.getPosition().y - parseInt(element.getStyle('margin-top'))) - 24;
				} else if (Position.page(element)[1] <= 0) {
					scrollingView.scrollTop = element.getPosition().y - parseInt(element.getStyle('margin-top'))) - 24;
				}
			}
	}

});
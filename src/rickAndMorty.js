CharacterListModel = function(options) {
    this.options = {};
    this.enhanceOptions(this.defaults);
    this.enhanceOptions(options);
    this.eventTarget = new EventTarget();	

    this.init();
};

CharacterListModel.prototype.defaults = {
    'characterListApi': 'https://rickandmortyapi.com/api/character?page=', 
    'initialPage': 1, 
    'currentPage': 1
};

CharacterListModel.prototype.enhanceOptions = function(options) {
    var that = this, 
        opt = this.options;

    for (var key in options) {
        if (options.hasOwnProperty(key))
            that.options[key] = options[key];
    }
};

CharacterListModel.prototype.init = function() {
    this.dispatchEvent('initiated', {'detail': {'init':  'ok'}});
};

CharacterListModel.prototype.load = function(opt_page, opt_fetchUrl) {
    this.dispatchEvent('model_busy', {'detail': {'count': 1}});
    this.fetchCharacterList(opt_page, opt_fetchUrl);
};

CharacterListModel.prototype.fetchCharacterList = function(opt_page, opt_fetchUrl) {
    var that = this;

    this.dispatchEvent('fetchingCharacterList', {
        'detail': {
            'page': opt_page || that.options.currentPage, 
            'fetchUrl': opt_fetchUrl || that.options.characterListApi
        }
    });

    fetch(opt_fetchUrl || that.options.characterListApi, {})
        .then(response => response.json())
        .then(data => {
            this.dispatchEvent('newCharacterListPageReady', {
                'detail': 
                    {
                        'data': data
                    }
                }
            );

        })
        .catch(error => {
            this.dispatchEvent('listFetchError', {
                'detail': 
                    {
                        'data': error
                    }
                }
            );
        });
};

CharacterListModel.prototype.dispatchEvent = function(eventName, eventInit) {
    this.eventTarget.dispatchEvent(new CustomEvent(eventName, eventInit));
};

CharacterListWidget = function(options) {
    this.options = {};
    this.enhanceOptions(this.defaults);
    this.enhanceOptions(options);
    this.id = options?.id || ('clw_' + this.options['baseContainerSelector']);
    this.model = new CharacterListModel(this.options);
    this.eventTarget = this.model.eventTarget;
    this.overlayCountdown = 0;
    this.contentData = null;

    this.init();
};

CharacterListWidget.prototype.defaults = {
    'baseContainerSelector': '#mainContainer', 
    'currentpage': 1
};

CharacterListWidget.prototype.enhanceOptions = function(options) {
    var that = this, 
        opt = this.options;

    for (var key in options) {
        if (options.hasOwnProperty(key))
            that.options[key] = options[key];
    }
};

CharacterListWidget.prototype.init = function() {
    this.render();
   // this.adjustMaxHeight();
    this.bindDomEvents();
    this.bindModelEvents();
    this.load();
};

CharacterListWidget.prototype.render = function() {
    document.querySelector(this.options.baseContainerSelector).innerHTML = this.templates_base();
    this.bindDomEvents();
};
	
CharacterListWidget.prototype.bindDomEvents = function() {
    var that = this;

    var paginationButtons = document.getElementsByClassName('listPaginationBtn');
    if (paginationButtons.length > 0) {
        Object.entries(paginationButtons).forEach(([key, btn]) => {
            btn.addEventListener('click', function(e) {
                if (!this.classList.contains('disabled')) {
                    this.classList.add('disabled');
                    that.toggleContentOverlay(true);
                    that.load(null, this.getAttribute('data-link'));
                }
            });
        });
    }
};
	
CharacterListWidget.prototype.bindModelEvents = function() {
    var that = this;

    that.eventTarget.addEventListener('fetchingCharacterList', function(e) {
        that.toggleContentOverlay(true);
    });

    that.eventTarget.addEventListener('newCharacterListPageReady', function(e) {
         that.handleCharactersList(e.detail?.data);
        that.render();
        that.toggleContentOverlay(false);
    });
};
	
CharacterListWidget.prototype.handleCharactersList = function(data) {
    this.contentData = data;
};
	
CharacterListWidget.prototype.toggleContentOverlay = function(isVisible) {

};
	
CharacterListWidget.prototype.load = function(opt_page, opt_fetchUrl) {
    this.model.load(opt_page, opt_fetchUrl);
};
	
CharacterListWidget.prototype.reload = function() {
    this.model.load();
};

CharacterListWidget.prototype.dispatchEvent = function(eventName, eventInit) {
    this.eventTarget.dispatchEvent(new CustomEvent(eventName, eventInit));
};
	
CharacterListWidget.prototype.templates_base = function() {
    var that = this, 
        rv = '<div class="charactersListWrapper">',
        contentData = that.contentData,
        characterList = contentData && contentData.results;

    rv += '<div class="charactersListContainer">';

    if (characterList && characterList.length > 0) {
        for (var character in characterList) {
            rv += that.templates_characterCard(characterList[character]);
        }
    } else {
        rv += 'No results';
    }

    rv += '</div>';
    rv += that.templates_paginationButtons(contentData);

    rv += '</div>';
    return rv;
};
	
CharacterListWidget.prototype.templates_characterCard = function(character) {
    var rv = '<div class="characterCard">';
    
    rv += '<div class="imageWrapper">' + 
        '<img src="' + character.image + '" width=300 height=300 title="' + character.name + '"></div>';
    
    rv += '<div class="characterInfo"><div class="section">';

    rv += '<a href="' + character.url + '">' + character.name + '</a>';
    rv += '<span class="status">' + character.status + ' - ' + character.species + '</span>';
    rv += '</div><div class="section">';
    rv += '</div><div class="section">';

    rv += '</div></div></div>';
    console.log(rv);
    return rv;
    + (character.name || 'belirsiz') + '</div>';
};
	
CharacterListWidget.prototype.templates_paginationButtons = function(content) {
    var rv = '';
    if (content && content.info) {
        rv += '<div class="paginationContainer">';

        rv += '<button class="listPaginationBtn previousPage' +
            (content.info.prev ? '' : ' disabled')  + '" data-link="' + 
            (content.info.prev ? content.info.prev : '') + 
            '">Previous</button>';

        rv += '<button class="listPaginationBtn nextPage' +
            (content.info.next ? '' : ' disabled')  + '" data-link="' + 
            (content.info.next ? content.info.next : '') + 
            '">Next</button>';

        rv += '</div>';
    } else {
        return '';
    }

    return rv;
};


(function () {
	if (typeof window.CustomEvent !== 'function') {
		function CustomEvent (event, params) {
			params = params || {'bubbles': false, 'cancelable': false, 'detail': null };
			
			var evt = document.createEvent( 'CustomEvent' );
			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
			return evt;
		}
		window.CustomEvent = CustomEvent;			
	}

	if (typeof window.EventTarget !== 'function') {
		function EventTarget() {
			var eventTarget = document.createDocumentFragment();
			
			function addEventListener(type, listener, useCapture, wantsUntrusted) {
				return eventTarget.addEventListener(type, listener, useCapture, wantsUntrusted);
			}
			
			function dispatchEvent(event) {
				return eventTarget.dispatchEvent(event);
			}
			
			function removeEventListener(type, listener, useCapture) {
				return eventTarget.removeEventListener(type, listener, useCapture);
			}
			
			this.addEventListener = addEventListener;
			this.dispatchEvent = dispatchEvent;
			this.removeEventListener = removeEventListener;
	    	}
		window.EventTarget = EventTarget;
	}
}) ();

window.addEventListener('DOMContentLoaded', () => {
    var cl = new CharacterListWidget();
});


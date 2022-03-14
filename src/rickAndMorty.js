CharacterListModel = function(options) {
    this.options = {};
    this.enhanceOptions(this.defaults);
    this.enhanceOptions(options);
    this.eventTarget = new EventTarget();	

    this.characterCache = {};
    this.locationCache = {};
    this.episodeCache = {};
    this.init();
};

CharacterListModel.prototype.defaults = {
    'characterListApi': 'https://rickandmortyapi.com/api/character?page=', 
    'episodeDetailsApi': 'https://rickandmortyapi.com/api/episode/',
    'locationDetailsApi': 'https://rickandmortyapi.com/api/location/',
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
    this.characterCache = {};
    this.locationCache = {};
    this.episodeCache = {};
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
            that.updateCharacterCache(data);
            that.listAndFetchLocationsForCurrentCharacters();
        })
        .catch(error => {
            that.dispatchEvent('listFetchError', {
                'detail': 
                    {
                        'data': error
                    }
                }
            );
        });
};
        
CharacterListModel.prototype.listAndFetchLocationsForCurrentCharacters = function() {
    var that = this;

    var locationsArr = that.characterCache.results.reduce((initial, current) => {
        if (current.location && current.location.url) {
            let locId = current.location.url.replace('https://rickandmortyapi.com/api/location/', '');
            if (initial.indexOf(locId) < 0) {
                initial.push(locId);
            }
        }
        if (current.origin && current.origin.url) {
            let locId = current.origin.url.replace('https://rickandmortyapi.com/api/location/', '');
            if (initial.indexOf(locId) < 0) {
                initial.push(locId);
            }
        }
        return initial;
    }, []);
    that.fetchLocationsForCurrentCharacters(locationsArr);
};

CharacterListModel.prototype.fetchLocationsForCurrentCharacters = function(list) {
    var that = this, 
        urlSuffix = list.join(',');
    
    fetch(that.options.locationDetailsApi + urlSuffix, {})
        .then(response => response.json())
        .then(data => {
            that.updateLocationCache(data);
            that.listAndFetchEpisodesForCurrentCharacters();
        })
        .catch(error => {
            that.dispatchEvent('locationFetchError', {
                'detail': 
                    {
                        'data': error
                    }
                }
            );
        });
};
          
CharacterListModel.prototype.listAndFetchEpisodesForCurrentCharacters = function() {
    var that = this;

    var episodesArr = that.characterCache.results.reduce((initial, current) => {
        if (current.episode && current.episode.length > 0) {
            current.episode.forEach((episode) => {
                let epId = episode.replace('https://rickandmortyapi.com/api/episode/', '');
                if (initial.indexOf(epId) < 0) {
                    initial.push(epId);
                }
            });
        }
        return initial;
    }, []);
    that.fetchEpisodesForCurrentCharacters(episodesArr);
};

CharacterListModel.prototype.fetchEpisodesForCurrentCharacters = function(list) {
    var that = this, 
        urlSuffix = list.join(',');
    
    fetch(that.options.episodeDetailsApi + urlSuffix, {})
        .then(response => response.json())
        .then(data => {
            that.updateEpisodeCache(data);

            that.dispatchEvent('newCharacterListPageReady', {
                'detail': 
                    {
                        'characters': that.characterCache, 
                        'episodes': that.episodeCache,
                        'locations': that.locationCache
                    }
                }
            );

        })
        .catch(error => {
            that.dispatchEvent('episodeFetchError', {
                'detail': 
                    {
                        'data': error
                    }
                }
            );
        });
}; 
        
CharacterListModel.prototype.getEpisodeData = function(id) {
    return this.episodeCache[id];
};
        
CharacterListModel.prototype.getLocationData = function(id) {
    return this.locationCache[id];
};
    
CharacterListModel.prototype.updateCharacterCache = function(data) {
    this.characterCache = data;
};

CharacterListModel.prototype.updateLocationCache = function(data) {
    var that = this;

    if (data && !Array.isArray(data) && typeof data == 'object') {
        data = [data];
    }

    if (data && data.length > 0) {
        that.locationCache = {};
        data.forEach((location) => {
            that.locationCache[location.id] = location;
        });
    }
};
    
CharacterListModel.prototype.updateEpisodeCache = function(data) {
    var that = this;

    if (data && !Array.isArray(data) && typeof data == 'object') {
        data = [data];
    }

    if (data && data.length > 0) {
        that.episodeCache = {};
        data.forEach((episode) => {
            that.episodeCache[episode.id] = episode;
        });
    }
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
                    that.load(null, this.getAttribute('data-link'));
                }
            });
        });
    }
    window.addEventListener('resize', function(e) {
        that.resizeContentOverlay();
    });
};
	
CharacterListWidget.prototype.bindModelEvents = function() {
    var that = this;

    that.eventTarget.addEventListener('fetchingCharacterList', function(e) {
        that.toggleContentOverlay(true);
    });

    that.eventTarget.addEventListener('newCharacterListPageReady', function(e) {
        that.handleCharactersList(e.detail);
        that.handleEpisodes
        that.render();
        that.toggleContentOverlay(false);
    });
};
	
CharacterListWidget.prototype.handleCharactersList = function(data) {
    this.contentData = data.characters;
    this.episodes = data.episodes;
    this.locations = data.locations;
};
	
CharacterListWidget.prototype.resizeContentOverlay = function() {
    if (document.getElementsByClassName('charactersListContainer').length > 0 &&
            document.getElementsByClassName('paginationContainer').length > 0) {
        document.getElementsByClassName('contentOverlay')[0].style.height = 
            (+document.getElementsByClassName('charactersListContainer')[0].offsetHeight + 
            +document.getElementsByClassName('paginationContainer')[0].offsetHeight) + 'px';

    document.getElementsByClassName('contentOverlay')[0].style.width = 
        +document.getElementsByClassName('charactersListContainer')[0].offsetWidth + 'px';
    }
};
	
CharacterListWidget.prototype.toggleContentOverlay = function(isVisible) {
    this.resizeContentOverlay();

    if (isVisible) {
        document.getElementsByClassName('contentOverlay')[0].classList.add('activated');
    } else {
        document.getElementsByClassName('contentOverlay')[0].classList.remove('activated');
    }
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

    rv += '<h1>Welcome to Rick and Marty Characters List!</h1>';
    rv += '<div class="charactersListContainer">';
    rv += '<div class="contentOverlay"></div>';

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
    var rv = '<div class="characterCard">' + 
                '<div class="imageWrapper">' + 
                    '<img src="' + character.image + '" width=300 height=300 title="' + character.name + '">' + 
                '</div>' + 
                '<div class="characterInfo"><div class="section">' +
                    '<a class="characterName" href="' + 
                        character.url + 
                        '" target="_blank">' + 
                        character.name + 
                    '</a>' + 
                    '<span class="status">' + 
                        '<span class="statusBall ' + 
                            character.status + '">' + 
                        '</span>' + 
                        character.status + ' - ' + character.species + 
                    '</span>' + 
                '</div>' + 
                '<div class="section">' + 
                    '<span class="status sTitle">Last known location:</span>' + 
                    '<span class="status expandable">' + this.templates_locationDetails(character.location) + '</span>' + 
                '</div>' + 
                '<div class="section">' + 
                    '<span class="status sTitle">Origin:</span>' + 
                    '<span class="status expandable">' + this.templates_locationDetails(character.origin) + '</span>' + 
                '</div>' + 
                '<div class="section">' + 
                    '<span class="status sTitle">Episodes:</span>' + 
                    '<span class="status expandable episodes">' + this.templates_episodes(character.episode) + '</span>' + 
                '</div>' + 
            '</div>' + 
        '</div>';

    return rv;
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
	
CharacterListWidget.prototype.templates_locationDetails = function(location) {
    var rv = '';

    if (location.name != 'unknown') {
        let locId = location.url.replace('https://rickandmortyapi.com/api/location/', ''),
            locationData = this.model.getLocationData(locId);
        
        rv += locationData.name + 
            '<span class="locationExtraInfo">' + '<br>' +
            'Dimension: ' + locationData.dimension +
            '<br>' + 
            '# of Residents: ' + locationData.residents.length + 
            '<br>' + 
            'Type: ' + locationData.type + 
            '</span>';

    } else {
        rv += location.name;
    }

    return rv;
};


CharacterListWidget.prototype.templates_episodes = function(episodes) {
    var rv = '', 
        that = this;

    if (episodes && episodes.length > 0) {
        rv += '<span class="locationExtraInfo"><ul>';
        
        episodes.forEach((episode) => {
            var epData = that.model.getEpisodeData(episode.replace('https://rickandmortyapi.com/api/episode/', ''));
            rv += '<li>' + 
                epData.episode + 
                ' <br> ' + 
                epData.name + 
                '<br>' + 
                epData.air_date + 
                '</li>';
        });
        
        rv += '</span>';
    } else {
        rv += '...';
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

window.addEventListener('DOMContentLoaded', (ev) => {
    var cl = new CharacterListWidget();
});


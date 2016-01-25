//constants
const TICK_AVAILABLE = 'available';
const TICK_USED = 'used';
const TICK_EXPIRED = 'expired';
const TICK_WIDTH = 10;
const TICK_DIVIDER = 1 / TICK_WIDTH;
const MAX_TICKS = 96;

const MODE_EDITING = 'editing';
const MODE_DELETING = 'deleting';
const MODE_NEW = 'new';
const MODE_DEFAULT = '';

const CAROUSEL_CENTER = 480;
const CAROUSEL_EVENT_WIDTH = 240;

const GOING_LEFT = -1;
const GOING_RIGHT = 1;

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];

//events
var events = [];
var activeEvent;
var activeResizing = false;
var activeDragging = false;
var dragStartTick = 0;
var dragEndTick = 0;
var dragClickedTick = 0;
var dragClickOffset = new Point(0,0);
var dragFade = false;

//session-specific
var sessionCreations = 1;

//carousel
var carouselEventsObj;

//timeline
var timelineOffset;
var timelineObj;
var timelineTicks = new Array(MAX_TICKS + 1);
var timelineTickObjs;
var timelineHourObjs;
var timelineMouseX = 0;
var tickHovered = 0;

//creation
var createObj;
var createVisible = false;

//date
var today = new Date();
var dateController = moment();

var currentHour = today.getHours();
var currentMinutes = today.getMinutes();
var currentDayLabel = days[today.getDay()];
var currentMonthLabel = months[today.getMonth()];

//page objects
var headerDayObj;
var headerTimeObj;
var headerDateObj;
var noEventsObj;
var clearButtonObj;
var clockTimer;

/*================================================================
	Ticks, used for blocking time throughout the day
================================================================*/

function Point(x, y) {
	this.x = x;
	this.y = y;
}

var TimelineTick = function(tickIndex, tickObj) {
	
	this.index = tickIndex;
	this.obj = tickObj;
	this.state = TICK_AVAILABLE;
	this.expired = false;

	var hrs = Math.floor((tickIndex * 15) / 60);
	var mins = ((tickIndex % 4) * 15);
	this.time = formattedTime(hrs, mins);

	if(tickIndex < getTickByCurrentTime())
		this.expire(true);

}

TimelineTick.prototype.setState = function(state) {
	this.state = state;
	this.obj.removeClass('used').addClass(state);
}

//expired means the tick is already in the past
TimelineTick.prototype.expire = function(val) {
	this.expired = val;
	if(val == false)
		this.obj.removeClass('expired');
	else
		this.obj.addClass('expired');
}

//setup and add all timeline ticks
function populateTicks() {
	for(var i=0; i <= MAX_TICKS; ++i) {
		var tickObj = timelineTickObjs.eq(i);
		timelineTicks[i] = new TimelineTick(i, tickObj);
	}
	console.log(MAX_TICKS + ' timeline ticks added.');
}

//return whether a tick or range of ticks are generally available
function areTicksAvailable(a,b) {
	b = (b-1) || a;
	for(var i=a; i<=b; ++i) {
		if(timelineTicks[i].state != TICK_AVAILABLE) 
			return false;
	}
	return true;
}

//return whether a range of ticks are available for an event to be dragged to
function areTicksDraggable(skipEvent, newStart, newEnd) {
	for(var i=0; i<events.length; ++i) {
		if(skipEvent != events[i]) {
			if((events[i].startTick < newEnd) && (events[i].endTick > newStart))
				return false;
		}
	}
	return true;
}

//set the state of a tick or range of ticks
function setTickState(state,a,b) {
	b = (b-1) || a;
	for(var i=a; i<=b; ++i) {
		timelineTicks[i].setState(state);
	}
}

//automatically update the state of all ticks
function updateAllTickStates() {
	timelineTickObjs.removeClass('used');
	for(var r=0; r < MAX_TICKS; ++r)
		timelineTicks[r].setState(TICK_AVAILABLE);
	for(var i=0; i<events.length; ++i)
		setTickState(TICK_USED, events[i].startTick, events[i].endTick);
}

//get the nearest tick on the timeline based on current time
function getTickByCurrentTime() {
	updateTimeOfDay();
	return (currentHour * 4) + Math.floor(currentMinutes / 15);
}

//providing the mouse's X position, get the nearest tick on the timeline
function getTickByMouseX(number) {
  	return Math.floor(number * TICK_DIVIDER);
}

function capTickValue(tick) {
	return Math.min(Math.max(tick, 0), MAX_TICKS);
}

//get the actual (12:30 PM) time based on a provided tick number
function getTimeByTick(tick) {
	return timelineTicks[tick].time;
}

/*================================================================
	Basic time formatting
================================================================*/

function formattedTime(hours,minutes) {
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	return (hours + ':' + minutes + ' ' + ampm);
}

//get an accurant and present timestamp
function getTimestamp() {
	var ts = currentMonthLabel + " " + dateController.date() + " " + dateController.year();
    return ts;
}

function updateTimeOfDay() {
	currentHour = today.getHours();
	currentMinutes = today.getMinutes();
}

function isToday() {
	return (dateController.date() == today.getDate());
}

function isTomorrow() {
	return (dateController.date() == (today.getDate() + 1));
}

/*================================================================
	Header/view changes
================================================================*/

function updateCalendar() {
	//refresh all labels
	updateTimeLabel();
	updateDateLabel();
	updateDayLabel();
	updateHourstamp();

	//show or hide the time of day 
	if(isToday()) {
		$('.header .controls .time').removeClass('hide');
		//THIS IS FOR TESTING ONLY -- ADDS SAMPLE TO PAGE WHEN DATE IS TODAY
		if(!events.length) {
			addSampleEvents();
			selectEvent(events[0]);
		}
	} else {
		$('.header .controls .time').addClass('hide');
		removeAllEvents(true);
	}
	console.log('Updated the calendar date to ' + currentDayLabel);
}

function updateTimeLabel() {
	headerTimeObj.text(formattedTime(today.getHours(), today.getMinutes()));
}

function updateDateLabel() {
	headerDateObj.text(getTimestamp());
}

function updateDayLabel() {
	if(isToday())
		currentDayLabel = 'Today';
	else if (isTomorrow())
		currentDayLabel = 'Tomorrow';
	else
		currentDayLabel = days[dateController.day()];
	headerDayObj.text(currentDayLabel);
}

function updateHourstamp() {
	updateTimeOfDay();
	timelineHourObjs.removeClass('present');
	timelineHourObjs.eq(currentHour).addClass('present');
}

function emptyCalendar(state) {
	//if calendar is empty...
	if(state) {
		noEventsObj.removeClass('hide');
		clearButtonObj.addClass('hide');
		setTickState(TICK_AVAILABLE, 0, MAX_TICKS);
	//if calendar has events..
	} else {
		noEventsObj.addClass('hide');
		clearButtonObj.removeClass('hide');
	}
}

/*================================================================
	Date controls
================================================================*/

function gotoNextDay() {
	dateController.add(1,'days');
	updateCalendar();	
}

function gotoPrevDay() {
	dateController.subtract(1,'days');
	updateCalendar();	
}

/*================================================================
	Interactivity handlers on the page
================================================================*/

//handles nearly all of the timeline interaction on the page.
function setupMouseEvents() {

	//get the position of the timeline on the page (used below)
	timelineOffset = timelineObj.offset();

	//event handler for mouse down = start a new event!
	timelineObj.mousedown(function() {
		if(activeResizing || !createVisible) return; //ignore all of this if we're currently in a state of resizing
		newEvent = addCalendarEvent('Untitled ' + sessionCreations, tickHovered, tickHovered + 1, MODE_NEW);
		orientCarousel(newEvent);
		selectEvent(newEvent);
		newEvent.timelineObj.children('.scrub.right').mousedown();
		sessionCreations++;
	});

	//while the mouse is moving, you can either resize or slide an event (depending on what state you're in)
	$(document).mousemove(function(e) {
        
        timelineMouseX = (e.pageX - timelineOffset.left);
        tickHovered = capTickValue(getTickByMouseX(timelineMouseX));
        
        //resize the event when the edges are being pulled left or right
        if(activeResizing && (tickHovered <= activeEvent.endEdge) && (tickHovered > activeEvent.startEdge)) {
        	activeEvent.resize(tickHovered);	
    		activeEvent.updatePageObjects();
    	//resize event when dragged around the timeline
        } else if(activeDragging) {
        	var dragDelta = tickHovered - dragClickedTick;
        	var dragEdge = MAX_TICKS - activeEvent.tickWidth;
			var newStart = Math.min(Math.max(dragStartTick + dragDelta, 0), dragEdge);
        	var newEnd = Math.min(Math.max(newStart + activeEvent.tickWidth, 0), MAX_TICKS);
        	if(areTicksDraggable(activeEvent,newStart,newEnd)) {
        		activeEvent.ghost(false);
	        	activeEvent.slide(newStart, newEnd);
	        	activeEvent.updatePageObjects();
	        } else {
	        	activeEvent.ghost(true);
	        	activeEvent.timelineObj.css({left:timelineMouseX - dragClickOffset.x});
	        }
        }
	});

	//this shows or hides the Create 'cursor' on the timeline
	$(timelineObj).mousemove(function(e) {
		//if the user isn't resizing or dragging, and the tick is available...
		if(!activeResizing && !activeDragging && areTicksAvailable(tickHovered)) {
        	if(!createVisible) showCreator();
			createObj.css({left:tickHovered * TICK_WIDTH});
		} else {
			hideCreator();
		}
	});

	//toggle state of creator based on mouse entering/leaving timeline
	$(timelineObj).mouseover(function(e) { createObj.removeClass('disabled'); });
	$(timelineObj).mouseout(function(e) { createObj.addClass('disabled'); });

	//header arrow controls
	$('.header .arrow.left').click(gotoPrevDay);
	$('.header .arrow.right').click(gotoNextDay);

	//clear calendar
	$('.header .button.clear').click(removeAllEvents);

	console.log('Mouse handlers set.');

}

//re-set the timeline's offset whenever the window resizes
function setupResizeEvents() {
	$(window).resize(function() {
	 	timelineOffset = timelineObj.offset();
	});
	console.log('Window resize handler set.');
}

/*================================================================
	Events, create/delete/move/resize
================================================================*/

function addCalendarEvent(title, startTick, endTick, setState) {
	var newEvent = new CalendarEvent(title, startTick, endTick, setState);
	events.push(newEvent);
	emptyCalendar(false); //show the 'clear' button in the header
	console.log('New event started at tick ' + startTick + ' [' + getTimeByTick(startTick) + ']');
	return newEvent;
}

function removeCalendarEvent(ev) {
	for(var i=0; i<events.length; ++i) {
		if(events[i] == ev) {
			events[i].destroy();
			events.splice(i,1);
		}
	}
	//hide the clear button
	if(events.length)
		selectEvent(events[events.length-1]);
	else
		emptyCalendar(true);
}

function removeAllEvents(quickDestroy) {
	quickDestroy = quickDestroy || false;
	//iterate through all events and destroy them
	while(events.length >= 1) {
		var i = events.length - 1;
		events[i].destroy(quickDestroy);
		events.pop();
	}
	emptyCalendar(true);
}

//hide creator
function hideCreator() {
	createVisible = false;
	createObj.hide();
}

//show creator
function showCreator() {
	createVisible = true;
	createObj.show();
}

function roundNearestHalf(num) {
    return Math.floor(num*2)*0.5;
}

//start resizing an event
function startResizing() {
	activeResizing = true;
}

//stop resizing an event
function stopResizing() {
	activeResizing = false;
	updateAllTickStates();
	if(activeEvent.state == MODE_NEW) {
		activeEvent.setState(MODE_EDITING);
	}
}

//start dragging an event
function startDragging() {
	console.log('Start dragging!');
	dragClickedTick = tickHovered;
	dragStartTick = activeEvent.startTick;
	dragEndTick = activeEvent.endTick;
	activeDragging = true;
}

//stop dragging an event
function stopDragging() {
	console.log('Stop dragging!');
	activeDragging = false;
	if(activeEvent.ghosted) {
		activeEvent.timelineObj.css({left: activeEvent.getLeftPixel()});
		activeEvent.ghost(false);
	}
	updateAllTickStates();
}

//select an event and make it active
function selectEvent(setEvent) {
	
	if(setEvent == activeEvent) return;

	if(activeEvent) {
		activeEvent.timelineObj.removeClass('selected');
		activeEvent.carouselObj.removeClass('selected editing');
		activeEvent.revertInput();
	}
	
	activeEvent = setEvent;
	activeEvent.timelineObj.addClass('selected');
	activeEvent.carouselObj.addClass('selected');

	orientCarousel();
}

//deselect all events
function deselectAllEvents() {
	
	if(activeEvent) {
		activeEvent.timelineObj.removeClass('selected');
		activeEvent.carouselObj.removeClass('selected editing');
		activeEvent = null;
	}
	
	orientCarousel();
}

//reposition the carousel in relation to an event on the timeline
function orientCarousel(theEvent) {
	theEvent = theEvent || activeEvent;

	var offsetX;
	if(theEvent == null) {
		offsetX = CAROUSEL_CENTER - (events.length * 130);
		carouselEventsObj.css({'left':offsetX});
		return;
	}

	var timelineObjCenter = theEvent.timelineObj.position().left + (theEvent.timelineObj.width() * 0.5);
	var cObjWidth = (theEvent.state == MODE_NEW ? 15 : 120);
	offsetX = theEvent.carouselObj.position().left - timelineObjCenter + cObjWidth;
	carouselEventsObj.css({'left':-offsetX})
}

//find nearest event based on a provided tickmark
function findNearestEvent(compareTick) {
	
	if(!events.length) return null;
	
	var closestIndex = 0;
	var closestDistance = MAX_TICKS;
	var currentDistance = 0;

	for(var i=0; i<events.length; ++i) {
		currentDistance = Math.abs(compareTick - events[i].startTick);
		if((currentDistance > 0) && (currentDistance < closestDistance)) {
			closestDistance = currentDistance;
			closestIndex = i;
		}
	}

	return events[closestIndex] || events[0];
}

/*================================================================
	Calendar event object
================================================================*/

var CalendarEvent = function(title,startTick,endTick,startState) {
	this.title = title;
	this.pixelWidth = 0; //how big the block is in the browser
	this.tickWidth = 0; //how many 'ticks' it occupies
	this.setInitialTime(startTick,endTick); //set starting start/end
	this.ghosted = false; //when the unit is free-floating off the timeline
	this.needsReorder = false; //flag that is checked when block re-enters timeline ("does carousel need to be re-ordered?"")
	this.deleting = false; //event is being deleted
	this.complete = false; //is event completed or not (did it occur)
	this.firstEdit = (startState == MODE_NEW); 
	this.timelineID = Math.random().toString(36).substring(7);
	this.carouselID = Math.random().toString(36).substring(7);
	this.timelineObj = null;
	this.carouselObj = null;
	this.titleObj = null;
	this.pillTitleObj = null;
	this.inputObj = null;
	this.resizeDirection = 0;
	this.carouselIndex = 0;
	this.state = startState;
	this.editObj = null;
	this.addToTimeline();
	this.addToCarousel();
	this.updateTitle(title);
}

CalendarEvent.prototype.setInitialTime = function(startTick,endTick) {

	this.startTick = startTick;
	this.endTick = endTick;
	this.startEdge = 0;
	this.endEdge = MAX_TICKS;
	
	setTickState(TICK_USED, startTick, endTick);

	this.updateWidth();

}

CalendarEvent.prototype.setBoundaries = function() {
	//find the rightmost edge
	var i = this.endTick;
	var setCapEnd = null; 
	while (i < MAX_TICKS && setCapEnd == null) {
		if(timelineTicks[i].state != TICK_AVAILABLE) setCapEnd = i;
		i++;
    }
    if(setCapEnd == null) setCapEnd = MAX_TICKS;

    //find the leftmost edge
    i = this.startTick - 1;
    var setCapStart = null;
    while (i >= 0 && setCapStart == null) {
    	if(timelineTicks[i].state != TICK_AVAILABLE) setCapStart = i;
    	i--;
    }
    if(setCapStart == null) {
    	setCapStart = -1;
    }

    this.startEdge = setCapStart;
   	this.endEdge = setCapEnd;
}

CalendarEvent.prototype.select = function() {
	selectEvent(this);
}

CalendarEvent.prototype.ghost = function(val) {
	if(val == true && this.ghosted == false) {
		this.ghosted = true;
		this.timelineObj.addClass('ghosted');
		this.carouselObj.addClass('ghosted');
	} else if (val == false && this.ghosted == true) {
		this.ghosted = false;
		this.timelineObj.removeClass('ghosted');
		this.carouselObj.removeClass('ghosted');
		this.needsReorder = true;
	}
}

CalendarEvent.prototype.resize = function(newTime) {

	if(this.resizeDirection == GOING_LEFT && newTime < this.endTick) {
		this.startTick = newTime;
	} else if(this.resizeDirection == GOING_RIGHT && newTime > this.startTick) {
		this.endTick = newTime;
	}

	this.updateWidth();
}

CalendarEvent.prototype.destroy = function(quickDestroy) {
	quickDestroy = quickDestroy || false;
	setTickState(TICK_AVAILABLE, this.startTick, this.endTick);
	if(quickDestroy == true) {
		this.removeObjs();
	} else {
		var thisEvent = this;
		var tempLeft = (this.carouselObj.offset().left);
		this.carouselObj.addClass('deleted');
		this.carouselObj.css({left: tempLeft});
		this.timelineObj.addClass('deleted');
		setTimeout(function() {
			thisEvent.carouselObj.remove();
			thisEvent.timelineObj.remove();
		}, 550);
	}
}

CalendarEvent.prototype.removeObjs = function() {
	this.carouselObj.remove();
	this.timelineObj.remove();
}

CalendarEvent.prototype.slide = function(newStart, newEnd) {
	//don't slide before 0
	if(newStart < 0) newStart = 0;
	this.startTick = newStart;

	//shift the end time based on new start time, don't let it past 95
	this.endTick = newEnd;

	//reposition carousel as event slides on timeline
	orientCarousel(this);
}

CalendarEvent.prototype.startTime = function() {
	return getTimeByTick(this.startTick);
}

CalendarEvent.prototype.endTime = function() {
	return getTimeByTick(this.endTime);
}

CalendarEvent.prototype.updateTitle = function(newTitle) {
	newTitle = newTitle || this.inputObj.val();
	this.title = newTitle;
	//update carousel
	this.titleObj.text(this.title);
	this.titleObj.text(this.title);
	this.inputObj.val(this.title);
	//update timeline
	this.pillTitleObj.html(this.startTime() + ' &mdash; ' + this.title);
}

CalendarEvent.prototype.revertInput = function() {
	this.inputObj.val(this.title);
}

CalendarEvent.prototype.updateWidth = function() {
	//calculate new tick widths and pixel widths of event
	this.tickWidth = (this.endTick - this.startTick);
	this.pixelWidth = (this.tickWidth * TICK_WIDTH) + 'px';	
	//if the timeline object exists, orient the carousel
	if(!this.timelineObj) return;
	orientCarousel(this);
}

CalendarEvent.prototype.complete = function() {
	this.complete = true;
}

CalendarEvent.prototype.addToTimeline = function() {
	//create timeline object html
	var html = '<div class="event"' +
					'id="' + this.timelineID + '"' +
					'style="width: ' + this.pixelWidth + '; left: ' + this.getLeftPixel() + '"' +
				'><div class="scrub left"></div><div class="pill"><div class="title">' + this.title + '</div></div><div class="scrub right"></div>';
	//insert to timeline
	$('.timeline .events').append(html);

	//associate objects
	this.timelineObj = $('#' + this.timelineID);	
	this.pillTitleObj = this.timelineObj.find('.title');
	
	var thisEvent = this;

	//add event listeners for clicking
	this.timelineObj.click(function(e) {
		thisEvent.setBoundaries();
		selectEvent(thisEvent);
	});	

	//event listener for resizing
	this.timelineObj.children('.scrub').mousedown(function(e) {
		e.stopPropagation();
		thisEvent.setBoundaries();
		if($(e.target).hasClass('right')) {
			thisEvent.resizeDirection = GOING_RIGHT;
		} else {
			thisEvent.resizeDirection = GOING_LEFT;
		}
		startResizing();
		$(document).one('mouseup', stopResizing);
	});	

	//event listener for dragging
	this.timelineObj.mousedown(function(e) {
		e.stopPropagation();
		if(activeEvent != thisEvent) return;
		thisEvent.setBoundaries();
		var offset = thisEvent.timelineObj.offset();
		dragClickOffset.x = (e.pageX - offset.left);
		dragClickOffset.y = (e.pageY - offset.top);
		startDragging();
		$(document).one('mouseup', stopDragging);
	});	

}

CalendarEvent.prototype.addToCarousel = function() {
	
	//create carousel object html
	var prevObj = this.prevEvent();
	var html = '<div class="event ' + this.state + '" id="' + this.carouselID + '">' +
					'<div class="time">' + getTimeByTick(this.startTick) + ' &mdash; ' + getTimeByTick(this.endTick) + '</div>' +
					'<div class="title">' + this.title + '</div>' +
					'<div class="controls"><i class="delete material-icons">delete</i><i class="edit material-icons">create</i></div>' +
					'<div class="actions"><div class="delete-confirm">Do you really want to delete?</div><input class="input" value="Untitled"><i class="cancel material-icons">clear</i><i class="accept material-icons">done</i></div>' +
				'</div>';
	
	if(prevObj != null) { 
		//if there is a nearest neighbor event on the calendar..
		if(prevObj.startTick < this.startTick) { 
			//if the nearest neighor occurs earlier, then add the new event afterwards on the carousel
			$(prevObj.carouselObj).after(html);
		} else { 
			//otherwise, add the event before the nearest neighbor on the carousel
			$(prevObj.carouselObj).before(html);
		}
	} else { 
		//if nothing else, add the event to the end of the carousel
		$('.carousel .events').append(html);
	}
	
	//associate the carousel objects
	this.carouselObj = $('#' + this.carouselID);	
	this.titleObj = this.carouselObj.children('.title');
	this.inputObj = this.carouselObj.find('.input');
	this.editObj = this.carouselObj.children('.edit');
	//ellipsify the title
	this.titleObj.dotdotdot();

	//event handlers for the carousel object
	var thisEvent = this;
	this.carouselObj.find('.material-icons').click(function(e) {
		
		//stop event from propagating to carousel event
		e.stopPropagation();
		
		var btn = $(this);

		if(btn.hasClass('edit')) {
			//if user enters editing mode
			thisEvent.select();
			thisEvent.setState(MODE_EDITING);
		} else if(btn.hasClass('delete')) {
			//if user attempts to delete the event
			thisEvent.select();
			thisEvent.setState(MODE_DELETING);
		} else if(btn.hasClass('cancel')) {
			//if user hits the cancel action
			if(thisEvent.state == MODE_DELETING) {
				thisEvent.setState(MODE_DEFAULT);
			} else {
				if(thisEvent.firstEdit) {
					removeCalendarEvent(thisEvent);
				} else {
					thisEvent.setState(MODE_DEFAULT);
					thisEvent.revertInput();
				}
			}
		} else if(btn.hasClass('accept')) {
			//if user hits the accept action
			if(thisEvent.state == MODE_DELETING) {
				removeCalendarEvent(thisEvent);
			} else {
				thisEvent.setState(MODE_DEFAULT);
				thisEvent.updateTitle();
			}
		}
		if(thisEvent.firstEdit == true) {
			//if event was just made, clear 'firstEdit' state
			thisEvent.firstEdit = false;
		}
	});
	//select the new event on the timeline
	this.carouselObj.click(function() {
		thisEvent.select();
	});

}

//set the state for the event (new, editing)
CalendarEvent.prototype.setState = function(setState) {
	
	this.state = setState;
	this.carouselObj.removeClass('new editing deleting');
	this.carouselObj.addClass(setState);
	
	orientCarousel(this);
	
	if(setState == MODE_EDITING) {
		activeEvent.inputObj.focus();
		if(activeEvent.firstEdit == true)
			activeEvent.inputObj.select();
	}
}

//left position of the timeline object
CalendarEvent.prototype.getLeftPixel = function() {
	return (this.startTick * TICK_WIDTH) + 'px';
}

//redraw the event on the timeline and carousel
CalendarEvent.prototype.updatePageObjects = function() {
	this.timelineObj.css({left: this.getLeftPixel(), width: this.pixelWidth});
	this.carouselObj.children('.time').html(getTimeByTick(this.startTick) + ' &mdash; ' + getTimeByTick(this.endTick));
	this.pillTitleObj.html(this.startTime() + ' &mdash; ' + this.title);
	if(this.needsReorder) this.reorderCarousel();
}

//get the previous event (if any) on the carousel
CalendarEvent.prototype.prevEvent = function() {
	return findNearestEvent(this.startTick);
}

//reorder the event within the carousel based on its new position
CalendarEvent.prototype.reorderCarousel = function() {
	this.needsReorder = false;
	var nearest = findNearestEvent(this.startTick);
	if(this.startTick > nearest.startTick) {
		this.carouselObj.insertAfter(nearest.carouselObj);
	} else {
		this.carouselObj.insertBefore(nearest.carouselObj);
	}
	orientCarousel(this);
}

/*================================================================
	Start
================================================================*/

//testing purposes only!
function addSampleEvents() {
	addCalendarEvent('Coffee and sketching', 36, 39, MODE_DEFAULT);
	addCalendarEvent('New dashboard designs', 40, 50, MODE_DEFAULT);
	addCalendarEvent('Brand styleguide updates', 55, 65, MODE_DEFAULT);
	addCalendarEvent('Iconography', 66, 72, MODE_DEFAULT);
}


$(document).ready(function () {

	//link core page objects
	carouselEventsObj = $('.carousel .events');
	noEventsObj = $('.calendar .no-events');
	timelineObj = $('.timeline .events');
	timelineTickObjs = $('.tickers .tick');
	timelineHourObjs = $('.hourstamps .hour');
	createObj = $('.timeline .event.create');
	headerDayObj = $('.header .day');
	headerTimeObj = $('.header .time span');
	headerDateObj = $('.header .date span');
	clearButtonObj = $('.header .button.clear');

	//create and associate ticks on timeline
	populateTicks();
	//resize handler
	setupResizeEvents();
	//hide creator
	hideCreator();
	//handle all mouse events
	setupMouseEvents();
	//update page header details
	updateCalendar();
	
	//if you're not testing with sample events, this should be enabled
	//show the empty state "No Sessions" label
	//emptyCalendar(true);

	//update the clock in realtime
	clockTimer = setTimeout(updateTimeLabel, 1000);
	
	updateAllTickStates();

});


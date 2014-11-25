/*******************************************************************************
 * Copyright (c) 2014 IBM Corp.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution.
 *
 * The Eclipse Public License is available at
 *   http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at
 *   http://www.eclipse.org/org/documents/edl-v10.php.
 *
 * Contributors:
 *   Bryan Boyd - Initial implementation 
 *******************************************************************************/

function Place(name, options) {
	this.name = name;
	if (options && options.center) {
		this.center = {
			lon: options.center.lon,
			lat: options.center.lat
		}
		if (options.min) {
			this.min = {
				lon: options.min.lon,
				lat: options.min.lat
			}
		}
		if (options.min) {
			this.max = {
				lon: options.max.lon,
				lat: options.max.lat
			}
		}
	} else {
		this.defaultZoom = { lon: 50, lat: 50 }
	}
	if (options && options.defaultZoom) {
		this.defaultZoom = options.defaultZoom;
	} else {
		this.defaultZoom = 15;
	}
}
Place.prototype.getName = function() {
	return this.name;
}
Place.prototype.getCenter = function() {
	return this.center;
}

var Places = {
	AUSTIN: new Place("Austin", {
		center: {
			lon: -97.74024, 
			lat: 30.27455
		}, 
		defaultZoom: 15
	}),
	SANFRANCISCO: new Place("San Francisco", {
		center: {
			lon: -122.41581, 
			lat: 37.77356
		}, 
		defaultZoom: 15
	}),
	VEGAS: new Place("Las Vegas", {
		center: {
			lon: -115.17295, 
			lat: 36.11460
		}, 
		defaultZoom: 15
	})
}

var defaults = {
	locale: "en",
	mapType: "osm", 
	mapLocation: Places.AUSTIN,
}

var Images = {
	car: new Image()
}

function getImage(filename) {
	for (var i in Images) {
		var path = Images[i].src.split("/");
		if (path[path.length - 1] == filename) {
			return Images[i];
		}
	}
}

Images.car.src = "img/redcar.png";

function getUrlVars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
		vars[key] = value;
	});
	return vars;
}

var win = {
	x: null,
	y: null,
	center: { lon: null, lat: null },
	width: null,
	height: null
};

function centerContainers() {
	var offset = ((canvas.offsetWidth - document.getElementById("toolbarContainer").offsetWidth) / 2);
	$("#toolbarContainer").css("right", offset + "px");
	offset = ((canvas.offsetWidth - 610) / 2);
	$("#statusContainer").css("left", offset + "px");
	offset = ((canvas.offsetWidth - $(".bottomContainer")[0].offsetWidth) / 2);
	$(".bottomContainer").css("right", offset + "px");

	offset = (70 + canvas.offsetWidth / 2);
	$("#leftBottomContainer").css("right", offset + "px");
}

function setStrings() {
	$("#carText").html("car");
	$("#carsText").html("cars");
	$("#viewersText").html("viewers");
	$("#framerateText").html("framerate");
}

function init() {
	console.log("init()");
	setStrings();

	ctxFont = "24px Arial";
	setTimeout(function() { resize(); }, 1000);

	$(".disabled-link").click(function(event) {
		event.preventDefault();
	});

	resizeMap();
	centerContainers();

	demo = new Demo();
	demo.init();

	win.width = demo.ui.canvas.width;
	win.height = demo.ui.canvas.height;

	$("#leftPop").popover("show");
	$("#rightPop").popover("show");

	setInterval(function() {
		var count = 0;
		var toDelete = [];
		var now = (new Date()).getTime();
		for (var i in demo.mapObjects["Cars"].objects) {
			var c = demo.mapObjects["Cars"].objects[i];
			if (c.isCountable()) {
				count++;
			}
			if (now - c.lastUpdate > 5000) {
				toDelete.push(i);
			}
		}
		for (var i in toDelete) {
			console.log("deleting " + toDelete[i]);
			delete demo.mapObjects["Cars"].objects[toDelete[i]];
		}
		$("#statConnectionCount").html(count);

		$("#statFramerate").html((frame_count - last_frame_count));
		last_frame_count = frame_count;
	}, 1000);

	setTimeout(function() {
		$("#toolbarContainer").hide();
		$("#toolbarContainer").css("visibility", "visible");
		$("#toolbarContainer").fadeIn();
		$("#bottomContainer").hide();
		$("#bottomContainer").css("visibility", "visible");
		$("#bottomContainer").fadeIn();
		$("#framerateContainer").hide();
		$("#framerateContainer").css("visibility", "visible");
		$("#framerateContainer").fadeIn();
		$("#browserId").html(demo.id);
		$("#idContainer").hide();
		$("#idContainer").css("visibility", "visible");
		$("#idContainer").fadeIn();

		demo.connect();
		doFrame();
	}, 2000);
}

var last_frame_count = 0;
var frame_count = 0;
function draw() {
	demo.draw()
	var count = 0;
	for (var i in demo.mapObjects) {
		for (var j in demo.mapObjects[i].objects) {
			count++;
		}
	}
	$("#statObjectCount").html(count);
	frame_count++;
};
function doFrame() {
	update();
	draw();
	setTimeout(doFrame, 20);
}
function update() {
	demo.updateObjects();
};

//window.addEventListener("orientationchange", function() { resize(); });

function resize() {
	console.log("RESIZE");
	demo.ui.canvas.width = window.innerWidth;
	demo.ui.canvas.height = window.innerHeight;
	demo.ui.context.canvas.width = demo.ui.canvas.width;
	demo.ui.context.canvas.height = demo.ui.canvas.height;
	win.width = demo.ui.canvas.width;
	win.height = demo.ui.canvas.height;
	win.center = Utils.xyToGeo(win.width / 2, win.height / 2);
	centerContainers();
	resizeMap();
	demo.ui.updateViewport();
}

function resizeMap() {
	var mapnode = document.getElementById("openLayersMap");
	mapnode.style.width = window.innerWidth + "px";
	mapnode.style.height = window.innerHeight + "px";
}

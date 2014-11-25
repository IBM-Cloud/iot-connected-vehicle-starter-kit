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

var Utils = {
	_fromProjection:  new OpenLayers.Projection("EPSG:4326"),
	_toProjection: new OpenLayers.Projection("EPSG:900913"),

	toOL: function(xy) {
		var result = xy;
		return result.transform(this._fromProjection, this._toProjection);
	},
	toLL: function(xy) {
		var result = xy;
		return result.transform(this._toProjection, this._fromProjection);
	},

	getCurrentTime: function() { 
		var d = new Date(); 
		var ms = d.getMilliseconds();
		mstr = ms;
		if (ms < 100 && ms >= 10) {
			mstr = "0" + ms;
		} else if (ms < 10) {
			mstr = "00" + ms;
		}
		return d.getSeconds() + ":" + mstr; 
	},

	randomString: function(length) {
		var text = "";
		var allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		for (var i = 0; i < length; i++) {
			text += allowed.charAt(Math.floor(Math.random() * allowed.length));
		}
		return text;
	},

	randomUppercaseString: function(length) {
		var text = "";
		var allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		for (var i = 0; i < length; i++) {
			text += allowed.charAt(Math.floor(Math.random() * allowed.length));
		}
		return text;
	},

	publish: function(topic, message, retained) {
		var msgObj = new Messaging.Message(message);
		msgObj.destinationName = topic;
		if (retained) { msgObj.retained = true; }
		demo.mqttclient.client.send(msgObj);
	},

	geoToXY: function(lon, lat) {
		if (!lat) {
			var geo = lon;
			lat = geo.lat;
			lon = geo.lon;
		}
		var xy = { 
			x: (parseFloat(lon) - demo.ui.getMinLon()) / (demo.ui.getMaxLon() - demo.ui.getMinLon()) * win.width,
			y: win.height - ((parseFloat(lat) - demo.ui.getMinLat()) / (demo.ui.getMaxLat() - demo.ui.getMinLat()) * win.height),
		};
		return xy;
	},

	getXYDist: function(pt1, pt2) {
		var dist = Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
		return dist;
	},

	getGeoDist: function(geo1, geo2) {
		var dist = Math.sqrt(Math.pow(geo2.lon - geo1.lon, 2) + Math.pow(geo2.lat - geo1.lat, 2));
		return dist;
	},

	xyToGeo: function(x, y) {
		if (!y) {
			y = x.y;
			x = x.x;
		}
		var geo = { 
			lon: demo.ui.getMinLon() + (x / win.width * demo.ui.getLonWidth()),
			lat: demo.ui.getMinLat() + ((win.height - y) / win.height * demo.ui.getLatHeight()),
		};
		return geo;
	},

	vectorToRadians: function(vector, precision) {
		if (precision == null) { precision = 3; }
		var rad = (Math.atan(vector.y / vector.x)).toFixed(precision);
		return parseFloat(rad);
	},

	radiansToDegrees: function(rad, precision) {
		if (precision == null) { precision = 1; }
		return (360 * (rad / (2*Math.PI))).toFixed(precision);
	},

	Colors: {
		RED: "rgba(176, 128, 128, 0.9)",
		DARKRED: "rgba(176, 0, 0, 0.9)",
		WHITE: "rgba(255, 255, 255, 0.9)",
		BROWN: "rgba(65, 13, 0, 0.9)",
		YELLOW: "rgba(216, 189, 48, 0.9)",
		BRIGHTYELLOW: "rgba(240, 230, 80, 0.9)",
		BLUE: "rgba(42, 81, 124, 0.9)",
		Poly: {
			RED : "rgba(200, 0, 0, 0.3)",
			SOLIDRED : "rgba(200, 0, 0, 1.0)",
			DARKRED : "rgba(120, 0, 0, 0.5)",
			BRIGHTRED : "rgba(255, 0, 0, 0.9)",
			PINK : "rgba(255, 160, 160, 0.3)",
			YELLOW : "rgba(220, 220, 0, 0.2)",
			SOLIDYELLOW : "rgba(220, 220, 0, 1.0)",
			DARKYELLOW : "rgba(200, 200, 0, 0.3)",
			GREEN : "rgba(0, 120, 0, 0.3)",
			BRIGHTGREEN : "rgba(0, 255, 0, 0.9)",
			BLUE : "rgba(0, 0, 180, 0.25)",
			BROWN : "rgba(139, 69, 19, 0.4)",
			DARKBROWN : "rgba(139, 69, 19, 0.8)",
			WHITE : "rgba(255, 255, 255, 0.7)"
		}
	},
}


/******************************
 *                            *
 *      Demo                  *
 *                            *
 ******************************/
function Demo() {
	this.ui = new UI(this);
	this.id = Utils.randomUppercaseString(3);
	this.mqttclient = new MQTTClient(this.id);
	this.mapObjects = {};
}

Demo.prototype.init = function() {
	this.ui.updateViewport();
	this.ui.init();

	// add map objects to the demo
	this.addMapObject("MapGraphs", new MapGraphSet());
	this.addMapObject("Cars", new MapObjectSet());
	this.addMapObject("Fence", new FenceSet());
}

Demo.prototype.getCar = function(id) {
	return (this.mapObjects.Cars.objects[id] || null);
}

Demo.prototype.getFence = function(id) {
	return demo.mapObjects["Fence"].objects[id];
}

Demo.prototype.getFences = function() {
	return demo.mapObjects["Fence"].objects;
}

Demo.prototype.getNextFenceID = function() {
	for (var i = 1; i <= 25; i++) {
		var alreadyTaken = false;
		for (var j in demo.mapObjects["Fence"].objects) {
			if (demo.mapObjects["Fence"].objects[j].id == i) {
				alreadyTaken = true;
			}
		}
		if (!alreadyTaken) { return i; }
	}
	// this is an error
	return -1;
}

Demo.prototype.createFence = function() {
	this.mapObjects["Fence"].createFence();
}

Demo.prototype.clearFence = function(id) {
	this.mapObjects["Fence"].deleteFence(id);
}

Demo.prototype.saveFence = function(id) {
	this.mapObjects["Fence"].saveFence(id);
}

Demo.prototype.addMapObject = function(name, objectType) {
	this.mapObjects[name] = objectType;
	this.mapObjects[name].type = name;
}

Demo.prototype.connect = function() {
	this.mqttclient.connect();
}

Demo.prototype.updateObjects = function() {
	for (var i in this.mapObjects) {
		this.mapObjects[i].update();
	}
}

Demo.prototype.drawMapObjects = function() {
	for (var i in this.mapObjects) {
		this.mapObjects[i].draw();
	}
}

Demo.prototype.drawMapObjectOverlays = function() {
	for (var i in this.mapObjects) {
		this.mapObjects[i].drawOverlays();
	}
}

Demo.prototype.drawBackgroundMapPolygons = function() {
	for (var i in this.mapPolygons) {
		if (this.mapPolygons[i].isBackground()) {
			this.mapPolygons[i].draw();
		}
	}
	var fences = this.getFences();
	for (var i in fences) {
		if (fences[i].polygon) { 
			fences[i].polygon.draw();
		}
	}
}


Demo.prototype.draw = function() {
	this.ui.trackSelected();
	this.ui.context.clearRect(0, 0, demo.ui.canvas.width, demo.ui.canvas.height);
	this.drawBackgroundMapPolygons();
	this.drawMapObjects();
	this.drawMapObjectOverlays();

	if (this.ui.selectedObj) { this.ui.selectedObj.draw(); }
	if (this.ui.selectedObj) { this.ui.selectedObj.drawOverlay(); }
}

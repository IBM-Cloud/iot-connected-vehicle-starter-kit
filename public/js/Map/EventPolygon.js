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

/*****************************************************************************
 *                            
 *                              EventPolygonSet         
 *
 *   A set of EventPolygons.  Those that inherit this object should implement
 *   the "sub" method, an onMessage callback that is used to populate/update
 *   EventPolygon objects in the set.
 *                            
 ****************************************************************************/
function EventPolygonSet() {
	this.dangerPoly = new EventPolygon("danger")
	this.warningPoly = new EventPolygon("warning")
	this.innerSelectPoly = new EventPolygon("innerSelect")
	this.outerSelectPoly = new EventPolygon("outerSelect")
	
	// childen must implement
	this.sub = new Subscription(topicPrefix + "event/polyOutput", (function(ctx) {
		return function(msg) {
			if (msg.destinationName != (topicPrefix + "event/polyOutput")) { return; }
			var m = msg.payloadString;
			if (m.length == 0) {
				return;
			}

			ctx.dangerPoly = new EventPolygon("danger");
			ctx.warningPoly = new EventPolygon("warning");
			ctx.innerSelectPoly = null;
			ctx.outerSelectPoly = null;
			demo.setState(Utils.EventStates.EVENT_CREATED);

			if (demo.isPresenter()) {
				PresenterActions.drawEventSelectPoly();
			}

			var dangerPoly = [];
			var warningPoly = [];

			var dangerPolyStr = m.split("&")[0];
			var warningPolyStr = m.split("&")[1];

			var pt = "";
			pt = dangerPolyStr.split("|");
			for (var i in pt) {
				dangerPoly.push({ lon: pt[i].split(",")[0], lat: pt[i].split(",")[1] });
			}

			pt = warningPolyStr.split("|");
			for (var i in pt) {
				warningPoly.push({ lon: pt[i].split(",")[0] , lat: pt[i].split(",")[1] });
			}

			ctx.warningPoly.setPoints(warningPoly);
			ctx.dangerPoly.setPoints(dangerPoly);
		}
	})(this));
}

EventPolygonSet.prototype = new MapPolygonSet();

EventPolygonSet.prototype.reset = function() {
	this.dangerPoly = null;
	this.warningPoly = null;
	this.innerSelectPoly = null;
	this.outerSelectPoly = null;
}

EventPolygonSet.prototype.draw = function() {
	if (this.outerSelectPoly) { this.outerSelectPoly.draw(); }
	if (this.innerSelectPoly) { this.innerSelectPoly.draw(); }
	if (this.warningPoly) { this.warningPoly.draw(); }
	if (this.dangerPoly) { this.dangerPoly.draw(); }
}

EventPolygonSet.prototype.startCreateEvent = function() {
	if (demo.getState() == Utils.EventStates.EVENT_SELECTION) {
		// we're in selection mode, cancel selection
		demo.cancelCreateEvent();
		toolbarButtonClicked($("#toolbarButton_select")[0], true);
	} else {
		demo.setState(Utils.EventStates.EVENT_SELECTION);
		this.initInputPolys();
	}
}

EventPolygonSet.prototype.cancelCreateEvent = function() {
	this.innerSelectPoly = null;
	this.outerSelectPoly = null;
}

EventPolygonSet.prototype.initInputPolys = function() {
	var centerPos = { x: win.width / 2, y: win.height / 2 };

	this.innerSelectPoly = new EventPolygon("innerSelect")

	var points = [];
	if (demo.location.name == "Manhattan") {
		points = [
			Utils.xyToGeo(centerPos.x - 15, centerPos.y - 52, true),
			Utils.xyToGeo(centerPos.x + 52, centerPos.y - 15, true),
			Utils.xyToGeo(centerPos.x + 15, centerPos.y + 52, true),
			Utils.xyToGeo(centerPos.x - 52, centerPos.y + 15, true)
		];
	} else {
		//var num = 35;
		var num = 90;
		points = [
			Utils.xyToGeo(centerPos.x - num, centerPos.y - num, true),
			Utils.xyToGeo(centerPos.x + num, centerPos.y - num, true),
			Utils.xyToGeo(centerPos.x + num, centerPos.y + num, true),
			Utils.xyToGeo(centerPos.x - num, centerPos.y + num, true)
		];
	}
	this.innerSelectPoly.setPoints(points);

	this.outerSelectPoly = new EventPolygon("outerSelect")

	if (demo.location.name == "Manhattan") {
		points = [
			Utils.xyToGeo(centerPos.x - 45, centerPos.y - 156, true),
			Utils.xyToGeo(centerPos.x + 156, centerPos.y - 45, true),
			Utils.xyToGeo(centerPos.x + 45, centerPos.y + 156, true),
			Utils.xyToGeo(centerPos.x - 156, centerPos.y + 45, true)
		];
	} else {
		//var num = 115;
		var num = 160;
		points = [
			Utils.xyToGeo(centerPos.x - num, centerPos.y - num, true),
			Utils.xyToGeo(centerPos.x + num, centerPos.y - num, true),
			Utils.xyToGeo(centerPos.x + num, centerPos.y + num, true),
			Utils.xyToGeo(centerPos.x - num, centerPos.y + num, true)
		];
	}
	this.outerSelectPoly.setPoints(points);
}

// return true if the inner is completely inside of the outer
EventPolygonSet.prototype.validatePolys = function() {
	for (var i = 1; i < this.outerSelectPoly.points.length; i++) {
		var start = this.outerSelectPoly.points[i];
		var end = this.outerSelectPoly.points[i-1];
		for (var j = 0; j < this.innerSelectPoly.points.length; j++) {
			var pt = this.innerSelectPoly.points[j];
			if (!Utils.isLeft(Utils.geoToXY(start), Utils.geoToXY(end), Utils.geoToXY(pt))) {
				return false;
			}
		}
	}
	return true;
}


EventPolygonSet.prototype.getPolygonString = function() {
	var polyStr = "";
	var sep = "";
	for (var i = 0; i < this.innerSelectPoly.points.length; i++) {
		polyStr += sep + this.innerSelectPoly.points[i].lon + "," + this.innerSelectPoly.points[i].lat;
		sep = "|";
	}
	polyStr += "&";
	var sep = "";
	for (var i = 0; i < this.outerSelectPoly.points.length; i++) {
		polyStr += sep + this.outerSelectPoly.points[i].lon + "," + this.outerSelectPoly.points[i].lat;
		sep = "|";
	}
	return polyStr;
}

/*****************************************************************************
 *                            
 *                                EventPolygon
 *
 *       Base class for all objects that will be displayed on the map.
 *                            
 ****************************************************************************/
function EventPolygon(type) {
	MapPolygon.call(this, Utils.randomString(20));
	this.type = "EventPolygon";
	this.numPoints = 4;
	this.points = [];
	this.finished = true;
	this.filled = true;

	if (type == "danger") {
		this.color = Utils.Colors.DARKRED;
	} else if (type == "warning") {
		this.color = Utils.Colors.YELLOW;
	} else if (type == "innerSelect") {
		this.color = Utils.Colors.Poly.DARKRED;
		this.editable = true;
		this.drawPoints = true;
	} else if (type == "outerSelect") {
		this.color = Utils.Colors.Poly.DARKYELLOW;
		this.editable = true;
		this.drawPoints = true;
	}

	for (var i = 0; i < this.numPoints; i++) {
		this.points.push({ lon: null, lat: null });
	}
}

EventPolygon.prototype = new MapPolygon();
EventPolygon.prototype.constructor = MapPolygon;

EventPolygon.prototype.movePoint = function(index, dx, dy) {
	var oldPos = Utils.geoToXY(this.points[index].lon, this.points[index].lat, true);
	oldPos.x += dx;
	oldPos.y += dy;
	var newGeo = Utils.xyToGeo(oldPos.x, oldPos.y, true);
	this.points[index].lon = newGeo.lon;
	this.points[index].lat = newGeo.lat;
}

EventPolygon.prototype.move = function(dx, dy) {
	for (var i in this.points) {
		this.movePoint(i, dx, dy);
	}
}

EventPolygon.prototype.moveEdge = function(startIndex, endIndex, dx, dy) {
	this.movePoint(startIndex, dx, dy);
	this.movePoint(endIndex, dx, dy);
}

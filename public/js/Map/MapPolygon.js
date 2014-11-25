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
 *                              MapPolygonSet         
 *
 *   A set of MapPolygons.  Those that inherit this object should implement
 *   the "sub" method, an onMessage callback that is used to populate/update
 *   MapPolygon objects in the set.
 *                            
 ****************************************************************************/
function MapPolygonSet() {
	this.polys = {};
	this.background = true;

	this.isBackground = function() {
		return this.background;
	}
	
	// childen must implement
	this.sub = null;
}

MapPolygonSet.prototype.draw = function() {
	for (var i in this.polys) {
		this.polys[i].draw();
	}
}

MapPolygonSet.prototype.reset = function() {
	this.polys = {};
}



/*****************************************************************************
 *                            
 *                                MapPolygon
 *
 *       Base class for all objects that will be displayed on the map.
 *                            
 ****************************************************************************/
function MapPolygon(id) {
	this.id = id;
	this.type = "MapPolygon";
	this.points = [];
	this.editable = false;
	this.color = Utils.Colors.Poly.White,
	this.filled = false;
	this.finished = false;
	this.drawPoints = false;
	this.pointRadius = 8;
}

MapPolygon.prototype.getColor = function() {
	return this.color;
}

MapPolygon.prototype.FILLER_POINT = -10000000;
MapPolygon.prototype.draw = function() {
	if (this.points.length == 0) { return; }

	// draw lines
	demo.ui.context.save();
	if (!this.filled) {  // if not filled, use a bigger brush
		demo.ui.context.lineWidth = 5;
		demo.ui.context.strokeStyle = this.color;
	} else {
		demo.ui.context.lineWidth = 1;
		demo.ui.context.strokeStyle = "#ffffff";
	}
	demo.ui.context.fillStyle = this.color;
	demo.ui.context.beginPath();
	demo.ui.context.moveTo((Utils.geoToXY(this.points[0])).x, 
				   (Utils.geoToXY(this.points[0])).y);
	for (var i = 1; i < this.points.length; i++) {
		var pt = this.points[i];
		if (pt.lon == this.FILLER_POINT) {
			continue;
		}
		var xypt = Utils.geoToXY(pt);
		demo.ui.context.lineTo(xypt.x, xypt.y);
	}
	demo.ui.context.closePath();
	if (this.filled) {
		demo.ui.context.fill();
	}
	demo.ui.context.stroke();

	// draw points
	if (this.drawPoints) {
		// draw points
		for (var i in this.points) {
			var pt = this.points[i];
			demo.ui.context.fillStyle = "#000";
			demo.ui.context.beginPath();
			demo.ui.context.arc(Utils.geoToXY(pt).x, Utils.geoToXY(pt).y, this.pointRadius, 0, Math.PI*2, true);
			demo.ui.context.closePath();
			demo.ui.context.fill();
			demo.ui.context.stroke();
		}
	}
	demo.ui.context.restore();
}

MapPolygon.prototype.setPoints = function(points) {
	this.points = points;
}

MapPolygon.prototype.isValid = function() {
	// polygon must be greater than 100 pixels in circumference
	var circ = 0;
	var start = null;
	for (var i in this.points) {
		var xy = Utils.geoToXY(this.points[i]);
		if (start) {
			circ += Utils.getXYDist(start, xy);
		} 
		start = xy;
	}
	return (circ > 100) ? true : false;
}

MapPolygon.prototype.isInside = function(x, y) {
	var pts = [];
	for (var i in this.points) {
		pts.push(Utils.geoToXY(this.points[i].lon, this.points[i].lat));
	}

	for (var i = 0; i < pts.length; i++) {
		var start = pts[i];
		var end = pts[i == 0 ? 3 : (i-1)];
		if (!Utils.isLeft(start, end, { x: x, y: y })) {
			return false;
		}
	}
	return true;
}

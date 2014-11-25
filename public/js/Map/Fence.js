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

/*******************************************************************
 *                            
 *                           FenceSet
 *
 *******************************************************************/
function FenceSet() {
	// inherit from parent
	MapObjectSet.call(this);
	this.noDeleteOnReset = true;

	// overwrite subscription method
	this.sub = null;
	setTimeout((function(ctx) { return function() { ctx.loadFences(); } })(this), 2000);
	setInterval((function(ctx) { return function() { ctx.loadFences(); } })(this), 10000);
}

FenceSet.prototype = new MapObjectSet();
FenceSet.prototype.constructor = MapObjectSet;

FenceSet.prototype.createFence = function() {
	var fence_id = Utils.randomUppercaseString(4);
	this.objects[fence_id] = new Fence(fence_id);
	this.objects[fence_id].inEdit = true;

	var points = [];
	var center = { lon: demo.ui._viewport.lon.center, lat: demo.ui._viewport.lat.center };
	var radius = Math.min(demo.ui._viewport.lon.max - demo.ui._viewport.lon.min, demo.ui._viewport.lat.max - demo.ui._viewport.lat.min) / 6;
	console.log(radius);
	points.push({ lon: center.lon, lat: center.lat + radius });
	points.push({ lon: center.lon + radius, lat: center.lat + radius });
	points.push({ lon: center.lon + radius, lat: center.lat });
	points.push({ lon: center.lon + radius, lat: center.lat - radius });
	points.push({ lon: center.lon, lat: center.lat - radius });
	points.push({ lon: center.lon - radius, lat: center.lat - radius });
	points.push({ lon: center.lon - radius, lat: center.lat });
	points.push({ lon: center.lon - radius, lat: center.lat + radius });

	this.objects[fence_id].geo = center;

	this.objects[fence_id].polygon = new FencePolygon();
	this.objects[fence_id].polygon.points = points;
	this.objects[fence_id].polygon.numPoints = points.length;

	this.objects[fence_id].type = "type";
	this.objects[fence_id].message = "test";
}

FenceSet.prototype.loadFences = function() {
	var url = "/GeospatialService_status";
	$.get(url, (function(ctx) { return function(data) { ctx.processFences(data); } })(this));
}

FenceSet.prototype.processFences = function(data) {
	console.log("FenceSet::processFences", data);

	for (var i in this.objects) {
		if (!this.objects[i].inEdit) {
			delete this.objects[i];
		}
	}
	
	for (var i in data.custom_regions) {
		var fence = data.custom_regions[i];
		var fence_id = fence.id;
		this.objects[fence_id] = new Fence(fence_id);

		var notifyOnExit = fence.notifyOnExit;

		var points = [];
		var avgLon = 0;
		var avgLat = 0;
		for (var j in fence.polygon) {
			var p = fence.polygon[j];
			points.push({ lon: p.longitude, lat: p.latitude });
			avgLon += p.longitude;
			avgLat += p.latitude;
		}
		
		this.objects[fence_id].geo.lon = avgLon / points.length;
		this.objects[fence_id].geo.lat = avgLat / points.length;

		this.objects[fence_id].polygon = new FencePolygon();
		this.objects[fence_id].polygon.points = points;
		this.objects[fence_id].polygon.numPoints = points.length;

		this.objects[fence_id].type = "type";
		this.objects[fence_id].message = "test";
	}
}

FenceSet.prototype.saveFence = function(id) {
	console.log("saveFence("+id+")");
	var body = {
		"regions" : [
			{
				"region_type": "custom",
				"name": this.objects[id].name,
				"notifyOnExit": "true",
				"polygon": this.objects[id].polygon.getPointsJSON()
			}
		]
	}
	console.log(body);
	$.get("/GeospatialService_addRegion", body, function(data) { 
		console.log("addRegion callback", data); 
	});
}

FenceSet.prototype.deleteFence = function(id) {
	console.log("deleteFence("+id+")");
	if (this.objects[id].inEdit) {
		delete this.objects[id];
	} else {
		var body = {
			"region_type": "custom",
			"region_name": this.objects[id].name
		}
		console.log(body);
		var url = "/GeospatialService_removeRegion";
		$.get(url, body, (function(ctx, fence_id) { 
			return function(data) { 
				//delete ctx.objects[fence_id];
			} 
		})(this, id));
	}
}

FenceSet.prototype.draw = function() {
	for (var i in this.objects) {
		this.objects[i].draw();
	}
}

FenceSet.prototype.switchSet = function(ids) {
	// switch set of cars to keep track of, delete the rest
	this.idSet = ids;
	console.log("new idSet = " + ids);
	var toDelete = [];
	demo.ui.deselect();
	for (var i in this.objects) {
		if (i != 99999 && this.idSet.indexOf(i) == -1) {
			toDelete.push(i);
		}
	}
	for (var i in toDelete) {
		console.log("deleting " + toDelete[i]);
		delete this.objects[toDelete[i]];
	}
}

/*****************************************************************************
 *                            
 *                              Fence
 *
 ****************************************************************************/
function Fence(id) {
	MapObject.call(this, id);
	this.type = "Fence";
	this.name = id;
	this.inEdit = false;
}

Fence.prototype = new MapObject();
Fence.prototype.constructor = MapObject;

Fence.prototype.drawPopover = function() {
	// update position
	$(".popover.left").css("left", this.pos.x - $(".popover.left").width() - this.getUnscaledRadius() - 40);
	$(".popover.right").css("left", this.pos.x + this.getUnscaledRadius() + 35);
	if (this.isSelected) {
		$(".popover.left").css("top", win.height / 2 - ($(".popover.left").height() / 2) - 2);
		$(".popover.right").css("top", win.height / 2 - ($(".popover.right").height() / 2) - 2);
	} else {
		$(".popover.left").css("top", this.pos.y - $(".popover.left").height());
		$(".popover.right").css("top", this.pos.y - $(".popover.right").height());
	}
	$(".popover").css("zIndex", "99");

	if (this.loadPopoverData) {
		// load content
		var data = this.getPopoverData();
		$(".popover.left").find(".popover-title").html(data.left.title);
		$(".popover.left").find(".popover-content").html(data.left.content);

		$(".popover.right").css("max-height", $(".popover.left").height());
		$(".popover.right").find(".popover-title").html(data.right.title);
		$(".popover.right").find(".popover-content").html(data.right.content);

		this.loadPopoverData = false;
	} else {
		// update existing content
		this.updatePopoverData();
	}
}

Fence.prototype.getPopoverData = function() {
	var data = { 
		left: {
			title: "",
			content: ""
		},
		right: {
			title: "",
			content: ""
		}
	};

	data.left.title = this.name;
	if (this.inEdit) {
		var createButton = '<button class="btn btn-success btn-small" style="width: 100%" onclick="demo.ui.deselect(); demo.saveFence(\''+this.id+'\')">Create</button>';
		data.left.content += createButton;
	}
	var deleteButton = '<button class="btn btn-info btn-small" style="width: 100%" onclick="demo.ui.deselect(); demo.clearFence(\''+this.id+'\')">Delete</button>';

	data.left.content += deleteButton;

	return data;
}

Fence.prototype.updatePopoverData = function() {
}

Fence.prototype.init = function() {

}

Fence.prototype.reset = function() {
}

Fence.prototype.getRadius = function() {
	return 15;
}

Fence.prototype.getUnscaledRadius = function() {
	return 15;
}

Fence.prototype.draw = function() { 
	if (!this.geo.lon || !this.geo.lat) { return; }
	if (this.deleted) { return; }
	
	// if outside of canvas bounds, don't draw
	if (this.pos.x < -5 || this.pos.x > demo.ui.canvas.width + 5 ||
		this.pos.y < -5 || this.pos.y > demo.ui.canvas.height + 5) {
		return 0;
	}

	if (this.inEdit) {
		this.polygon.drawPoints = true;
		this.polygon.draw();   //with points
	}

	var context = demo.ui.context;
	if (this.isSelected) {
		context.save();
		context.beginPath();
		context.fillStyle = "rgba(255,255,255,0.8)";
		context.arc(this.pos.x, this.pos.y, this.getRadius() + 5, 0, Math.PI*2, true);
		context.closePath();
		context.stroke();
		context.fill();
	}
	context.save();
	context.beginPath();
	context.fillStyle = "rgba(0,0,0,0.8)";
	context.arc(this.pos.x, this.pos.y, this.getRadius() / 2, 0, Math.PI*2, true);
	context.closePath();
	context.stroke();
	context.fill();

	if (this.isSelected) {
		this.drawPopover();
	}
}

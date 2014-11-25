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
 *                              MapObjectSet         
 *
 *   A set of MapObjects.  Those that inherit this object should implement
 *   the "sub" method, an onMessage callback that is used to populate/update
 *   MapObject's in the set.
 *                            
 ****************************************************************************/
function MapObjectSet() {
	this.objects = {};
	this.noDeleteOnReset = false;
	
	var topic = "iot-2/type/"+window.config.iot_deviceType+"/id/+/evt/telemetry/fmt/json";
	this.sub = new Subscription(topic, (function(ctx) {
		return function(message) {
			if (!message.destinationName.match("iot-2/type/"+window.config.iot_deviceType+"/id/[A-Za-z0-9]*/evt/telemetry/fmt/json")) { return; }
			var m = message.payloadString;

			var data_array = JSON.parse(message.payloadString);
			if (data_array.length) {

			} else {
				data_array = [data_array];
			}
			for (var i in data_array) {
				var data = data_array[i];
				if (ctx.objects[data.id] == null) {
					console.log("new car: " + data.id);
					ctx.objects[data.id] = new MapObject(data.id);
				}
				ctx.objects[data.id].setLocation(data.lng + "," + data.lat);
				ctx.objects[data.id].type = data.type;
				ctx.objects[data.id].name = data.name;
				ctx.objects[data.id].state = data.state;
				ctx.objects[data.id].description = data.description;
				ctx.objects[data.id].heading = data.heading;
				ctx.objects[data.id].speed = data.speed;
				ctx.objects[data.id].customProps = data.customProps;
				ctx.objects[data.id].lastUpdate = (new Date()).getTime();
			}
		}
	})(this));
}

MapObjectSet.prototype.draw = function() {
	for (var i in this.objects) {
		this.objects[i].draw();
	}
}

MapObjectSet.prototype.drawOverlays = function() {
	for (var i in this.objects) {
		this.objects[i].drawOverlay();
	}
}

MapObjectSet.prototype.update = function() {
	for (var i in this.objects) {
		this.objects[i].update();
	}
}

MapObjectSet.prototype.reset = function() {
	for (var i in this.objects) {
		this.objects[i].reset();
	}
	if (!this.noDeleteOnReset) {
		this.objects = {};
	}
}



/*****************************************************************************
 *                            
 *                                MapObject
 *
 *       Base class for all objects that will be displayed on the map.
 *                            
 ****************************************************************************/
function MapObject(id) {
	this.id = id;
	this.pos = {
		x: null,
		y: null
	}
	this.heading = 0;

	this.type = "circle";
	this.name = "default";
	this.state = "normal";
	this.geo = {
		lon: 0,
		lat: 0
	}
	this.color = "rgba(0,0,0,1.0)";
	this.description = "I am a connected car";

	this.overlaySet = new OverlaySet();

	this.isSelected = false;
	this.loadPopoverData = true;

	this.messages = [];  // list of msgData objects, for displaying a list of received messages for a particular car

	this.label = "";
	//this.setLabel(this.id);
}

MapObject.prototype.setLocation = function(data) { 
	this.geo.lon = parseFloat(data.split(",")[0]);
	this.geo.lat = parseFloat(data.split(",")[1]);
}
MapObject.prototype.setType = function(type) { this.type = type; }
MapObject.prototype.setName = function(name) { 
	this.name = name;
}
MapObject.prototype.setDescription = function(description) { this.description = description; }
MapObject.prototype.setState = function(state) { this.state = state; }
MapObject.prototype.setColor = function(color) { this.color = color; }

MapObject.prototype.setLabel = function(label) {
	this.removeOverlay(this.label);
	this.addOverlay(label, 0);
}

MapObject.prototype.getColor = function() {
	// children must overwrite
	return this.color
}

MapObject.prototype.getRadius = function() {
	var zoom = demo.ui.map.getZoom();
	var factor = 1;
	if (this.isSelected) { factor = 1.8; }
	var radius = factor * 14 * Math.pow(0.7, (18 - zoom));
	return Math.max(radius, 5);
}

MapObject.prototype.getUnscaledRadius = function() {
	var zoom = demo.ui.map.getZoom();
	var radius = 14 * Math.pow(0.7, (18 - zoom));
	return Math.max(radius, 5);
}

MapObject.prototype._getGeoString = function() {
	return "(" + (this.geo.lon).toFixed(5) + ", " + (this.geo.lat).toFixed(5) + ")";
}

MapObject.prototype._getMessagesHTML = function() {
	var html = "";
	for (var i in this.messages) {
		var d = this.messages[i];
		html += [
			"<div class='thingMessage' id='msg"+i+"'>", 
				"<div class='thingMessageSubject'><b>" + d.msgSubject + "</b></div>",
				"<div class='thingMessageDescription'>" + d.msgDescription + "<div class='thingMessageTime'>" + d.dateStr + " " + d.timeStr + "</div></div>",
				"<div class='thingMessageActions'><a href='javascript:deleteMessage(" + this.id + ", " + i + ")'>Close</a>",
				"<a href='javascript:Utils.publish(\"" + d.callbackTopic + "\", \"confirm,"+this.id+"\")'>Reply</a></div>",
			"</div>"
		].join("\n");
	}
	return html;
}


MapObject.prototype.pushMessage = function(msg) {
	this.messages.push(msg);
	if ($("#messagesContainer").is(":visible")) {
		demo.ui.updateMessagesContainer();
	}
}

MapObject.prototype.getPopoverData = function() {
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
	data.left.content = "";

	var status_location = this._getGeoString();
	var status_description = this.description;
	var status_state = this.state;
	var status_type = this.type;
	
	data.left.content += '<div><b>GPS:</b> <span class="value" id="status_location">'+status_location+'</span></div>';
	data.left.content += '<div><b>Speed:</b> <span class="value" id="status_speed">'+this.speed+'</span></div>';
	data.left.content += '<div><b>State:</b> <span class="value" id="status_state">'+this.state+'</span></div>';
	data.left.content += '<div><b>Type:</b> <span class="value" id="status_type">'+this.type+'</span></div><hr>';
	for (var i in this.customProps) {
		data.left.content += '<div><b>'+i+':</b> <span class="value" id="status_'+i+'">'+this.customProps[i]+'</span></div>';
	}
	data.left.content += '<div style="text-align: center; font-style: italic; padding: 10px;">&quot;<span id="status_description">'+this.description+'</span>&quot;</div>';

	return data;
}

MapObject.prototype.updatePopoverData = function() {
	var status_location = this._getGeoString();
	var status_description = this.description;
	var status_state = this.state;
	var status_type = this.type;
	$("#status_location").html(status_location);
	$("#status_description").html(status_description);
	$("#status_state").html(status_state);
	$("#status_type").html(status_type);
}

MapObject.prototype.reset = function() {
	Utils.publish(topicPrefix + "things/" + this.id, "", true);
}

MapObject.prototype.drawPopover = function() {
	// update position
	$(".popover.left").css("left", this.pos.x - $(".popover.left").width() - this.getUnscaledRadius() - 40);
	$(".popover.right").css("left", this.pos.x + this.getUnscaledRadius() + 35);
	if (this.isSelected) {
		$(".popover.left").css("top", win.height / 2 - ($(".popover.left").height() / 2) - 2);
		$(".popover.right").css("top", win.height / 2 - ($(".popover.right").height() / 2) - 2);
		$(".popover.left").css("left", win.width / 2 - $(".popover.left").width() - this.getUnscaledRadius() - 80);
		$(".popover.right").css("left", win.width / 2 + this.getUnscaledRadius() + 80);
	} else {
		$(".popover.left").css("top", this.pos.y - $(".popover.left").height());
		$(".popover.right").css("top", this.pos.y - $(".popover.right").height());
		$(".popover.left").css("left", this.pos.x - $(".popover.left").width() - this.getUnscaledRadius() - 80);
		$(".popover.right").css("left", this.pos.x + this.getUnscaledRadius() + 80);
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

		//this.loadPopoverData = false;
	} else {
		// update existing content
		this.updatePopoverData();
		//var data = this.getPopoverData();
		//$(".popover.left").find(".popover-title").html(data.left.title);
		//$(".popover.left").find(".popover-content").html(data.left.content);
	}
}

MapObject.prototype.draw = function() {
	// default is a circle, overwrite from children
	if (this.color == "") { return; }

	if (this.pos.x < -1*(this.getRadius() / 2) || this.pos.x > demo.ui.canvas.width + 5 ||
		this.pos.y < -1*(this.getRadius() / 2) || this.pos.y > demo.ui.canvas.height + 5) {
		// object is off-screen
		return;
	}

	var context = demo.ui.context;
	var radius = this.getRadius();
	if (this.type == "circle") {
		context.save();
		context.strokeStyle = "#111111";
		context.fillStyle = this.getColor();
		context.lineWidth = 3;
		context.beginPath();

		context.arc(this.pos.x, this.pos.y, radius, 0, Math.PI*2, true);

		context.closePath();
		context.stroke();
		context.fill();
		context.restore();
	} else if (this.type == "square") {
		context.save();
		context.strokeStyle = "#111111";
		context.fillStyle = this.getColor();
		context.lineWidth = 2;
		context.fillRect(this.pos.x - radius, this.pos.y - radius, radius*2+1, radius*2+1);
		context.strokeRect(this.pos.x - radius, this.pos.y - radius, radius*2+1, radius*2+1);
		context.restore();
	} else if (this.type == "triangle") {
		context.save();
		context.strokeStyle = "#111111";
		context.fillStyle = this.getColor();
		context.lineWidth = 2;
		context.beginPath();

		context.moveTo(this.pos.x, this.pos.y - radius*3/2);
		context.lineTo(this.pos.x+radius*3/2, this.pos.y + radius);
		context.lineTo(this.pos.x-radius*3/2, this.pos.y + radius);
		context.lineTo(this.pos.x, this.pos.y - radius*3/2);

		context.closePath();
		context.stroke();
		context.fill();
		context.restore();
	} else if (this.type == "diamond") {
		context.save();
		context.strokeStyle = "#111111";
		context.fillStyle = this.getColor();
		context.lineWidth = 2;
		context.beginPath();

		context.moveTo(this.pos.x-radius, this.pos.y);
		context.lineTo(this.pos.x, this.pos.y - radius);
		context.lineTo(this.pos.x+radius, this.pos.y);
		context.lineTo(this.pos.x, this.pos.y + radius);
		context.lineTo(this.pos.x-radius, this.pos.y);

		context.closePath();
		context.stroke();
		context.fill();
		context.restore();
	} else if (Images[this.type]) {
		var image = Images[this.type];
		var longestSide = Math.max(image.width, image.height);
		var factor = radius*3 / longestSide;
		var width = image.width * factor;
		var height = image.height * factor;
		if (this.type == "car") {
			context.save();
			context.translate(this.pos.x, this.pos.y);
			context.rotate((this.heading - 90) * Math.PI / 180);
			context.drawImage(image, 0 - (width / 2), 0 - (height / 2), width, height);
			context.restore();
		} else {
			context.drawImage(image, this.pos.x - (width / 2), this.pos.y - (height / 2), width, height);
			if (this.customProps.color) {
				context.strokeStyle = this.customProps.color;
				context.lineWidth = 2;
				context.strokeRect(this.pos.x - (width / 2) - 3, this.pos.y - (height / 2) - 3, width+6, height+6);
			}
		}
	}

	if (this.isSelected) {
		this.drawPopover();
	}
}

MapObject.prototype.update = function() {
	// non-moving, so just update the X/Y based on the map bound
	var dispPos = Utils.geoToXY(this.geo.lon, this.geo.lat);
	this.pos.x = dispPos.x;
	this.pos.y = dispPos.y;
}

MapObject.prototype.canSelect = function() {
	return true;
}
MapObject.prototype.isCountable = function() {
	return true;
}

MapObject.prototype.select = function() {
	this.isSelected = true;
	this.loadPopoverData = true;
}

MapObject.prototype.deselect = function() {
	this.isSelected = false;
}

MapObject.prototype.removeOverlay = function(text) {
	this.overlaySet.removeOverlayByText(text);
}

MapObject.prototype.addOverlay = function(text, duration, bgColor, textColor) {
	this.overlaySet.addOverlay(text, duration, bgColor, textColor);
}

MapObject.prototype.drawOverlay = function() {
	if (this.color == "") { return; }
	this.overlaySet.draw(this.pos, this.getUnscaledRadius() * 0.75);
}


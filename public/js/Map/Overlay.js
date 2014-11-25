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
 *                              OverlaySet         
 *
 *                       A set of Overlay objects
 *                            
 ****************************************************************************/
function OverlaySet() {
	this.overlays = {};
	this.count = 0;
}

OverlaySet.prototype.addOverlay = function(text, duration, bgColor, textColor) {
	if (duration == null)  { duration  = 5000; }
	if (!bgColor)   { bgColor   = "rgba(255,255,255,0.9)"; }
	if (!textColor) { textColor = "rgb(0,0,0)"; }

	var obj = new Overlay(text, duration, bgColor, textColor);
	this.overlays[obj.id] = obj;
	this.count++;

	if (duration > 0) {
		setTimeout((function(ctx, id) {
			return function() {
				ctx.removeOverlay(id);
			}
		})(this, obj.id), duration);
	}
}

OverlaySet.prototype.removeOverlay = function(id) {
	delete this.overlays[id];
	this.count--;
}

OverlaySet.prototype.removeOverlayByText = function(text) {
	var ids = [];
	for (var i in this.overlays) {
		if (this.overlays[i].text == text) {
			ids.push(this.overlays[i].id);
		}
	}
	for (var i in ids) {
		this.removeOverlay(ids[i]);
	}
}

OverlaySet.prototype.clear = function () {
	var ids = [];
	for (var i in this.overlays) {
		ids.push(this.overlays[i].id);
	}
	for (var i in ids) {
		this.removeOverlay(ids[i]);
	}
}

OverlaySet.prototype.draw = function(pos, objRadius) {

	if (this.count > 0) {
		var context = demo.ui.context;
		context.save();
		context.strokeStyle = "#000000";
		context.beginPath();
		context.moveTo(pos.x, pos.y);
		//context.lineTo(pos.x + (objRadius*4 / 3), pos.y - (objRadius*4 / 2));
		context.lineTo(pos.x + (objRadius*2), pos.y - (objRadius*3));
		context.stroke();
		context.restore();
	}

	var index = 0;
	for (var key in this.overlays) {
		this.overlays[key].draw({
			x: pos.x + 6*index,
			y: pos.y + 10*index
		}, objRadius);
		index++;
	}
}


/*****************************************************************************
 *                            
 *                                Overlay
 *
 *         Class to control display and timeout of all overlay data
 *                             for a MapObject
 *                            
 ****************************************************************************/
function Overlay(text, duration, bgColor, textColor) {
	this.id = Utils.randomString(20);
	this.text = text;
	this.duration = duration;
	this.bgColor = bgColor;
	this.textColor = textColor;
}

Overlay.prototype.draw = function(pos, objRadius) {
	var context = demo.ui.context;
	if (objRadius > 9.0) { objRadius = 9.0; }
	objRadius *= 2.5;
	context.font = objRadius * 2 + "pt HelveticaNeue";
	context.textAlign = "center";
	context.textBaseline = "middle";
	var msgWidth = context.measureText(this.text).width;

	context.save();
	context.fillStyle = this.bgColor;
	context.strokeStyle = "#000000";
	context.shadowOffsetX = 3;
	context.shadowOffsetY = 3;
	context.shadowBlur = 5;
	context.shadowColor = "rgba(0,0,0,0.2)";
	var spacing = objRadius;
	var height = objRadius * 3 + spacing;
	var heightOffset = 6;
	var startX = Math.round(pos.x + (objRadius/2.5*2) - 8);
	var startY = Math.round(pos.y - (objRadius/2.5*3) - height + 3);
	context.fillRoundedRect(startX, startY, msgWidth + spacing, height, 5, true, true);
	context.restore();

	context.save();
	context.fillStyle = this.textColor;
	context.fillText(this.text, startX + msgWidth / 2 + spacing / 2, startY + height/2);
	context.restore();
}

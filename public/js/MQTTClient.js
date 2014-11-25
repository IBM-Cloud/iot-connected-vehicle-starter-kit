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

function MQTTClient(id) {
	this.subscriptionList = {};

	this.iot_server = window.config.iot_deviceOrg+".messaging.internetofthings.ibmcloud.com";
	this.iot_port = 1883;
	this.iot_username = window.config.iot_apiKey;
	this.iot_password = window.config.iot_apiToken;
	this.iot_clientid = "a:"+window.config.iot_deviceOrg+":mapui" + id; 

	this.client = new Messaging.Client(this.iot_server, this.iot_port, this.iot_clientid);
	this.client.onMessageArrived = this.onMessage;
	this.client.onConnectionLost = function() { 
		console.log("disconnected!");
	}
}

MQTTClient.prototype.connect = function() {
	var connectOptions = new Object();
	connectOptions.cleanSession = true;
	connectOptions.useSSL = false;
	connectOptions.keepAliveInterval = 72000;
	connectOptions.userName = this.iot_username;
	connectOptions.password = this.iot_password;

	connectOptions.onSuccess = (function(me) {
		return function() { 
			console.log("connected!");
			demo.mqttclient.subscribe(Subscriptions.overlays);
			demo.mqttclient.subscribe(Subscriptions.geoAlerts);
			for (var i in demo.mapObjects) {
				me.subscribe(demo.mapObjects[i].sub);
			}
		}
	})(this);
	connectOptions.onFailure = function() { 
		console.log("error!");
	}

	this.client.connect(connectOptions);
}

MQTTClient.prototype.subscribe = function(sub) {
	if (!sub) { return; }
	// remove existing listener, if it hung around...
	if (this.subscriptionList[sub.topic]) { 
		this.subscriptionList[sub.topic] = null;
	}

	console.log("subscribing to " + sub.topic);
	this.client.subscribe(sub.topic, { onSuccess: function() { console.log("subscribed to: " + sub.topic); } });
	this.subscriptionList[sub.topic] = sub.onMessage;
}

MQTTClient.prototype.onMessage = function(msg) {
	for (var i in demo.mqttclient.subscriptionList) {
		demo.mqttclient.subscriptionList[i](msg);
	}
}


/******************************
 *                            *
 *  Subscription              * 
 *                            *
 ******************************/
function Subscription(topic, onMessage) {
	this.topic = topic;
	this.onMessage = onMessage;
}

var Subscriptions = {};
Subscriptions.overlays = new Subscription("iot-2/type/api/id/+/cmd/addOverlay/fmt/json", function(msg) {
	var pattern = "iot-2/type/api/id/[A-Za-z0-9]*/cmd/addOverlay/fmt/json";
	if (!msg.destinationName.match(pattern)) { return; }
	try {
		console.log(msg.payloadString);
		var data = JSON.parse(msg.payloadString);
		console.log(data);
		var id = data.id;
		var text = data.text;
		var fgColor = data.fgColor || "black"; 
		var bgColor = data.bgColor || "rgba(255,255,255,0.9)"; 
		var duration = data.duration || 3000;

		var c = demo.getCar(id);
		if (c) {
			c.addOverlay(text, duration, bgColor, fgColor);
		}
	} catch (e) { console.error(e.message); }
});
Subscriptions.geoAlerts = new Subscription(window.config.notifyTopic, function(msg) {
	if (!msg.destinationName.match(window.config.notifyTopic)) { return; }
	try {
		var data = JSON.parse(msg.payloadString);
		console.log(data);
		var id = data.deviceInfo.id;
		var text = data.eventType;
		var fgColor = "white"; 
		var bgColor = "rgba(0,0,0,0.8)"; 
		var duration = 2000;

		var c = demo.getCar(id);
		if (c) {
			c.addOverlay(text, duration, bgColor, fgColor);
		}
		/*
		var id = data.id;
		var text = data.text;
		var fgColor = data.fgColor || "black"; 
		var bgColor = data.bgColor || "rgba(255,255,255,0.9)"; 
		var duration = data.duration || 3000;

		var c = demo.getCar(id);
		if (c) {
			c.addOverlay(text, duration, bgColor, fgColor);
		}
		*/
	} catch (e) { console.error(e.message); }
});

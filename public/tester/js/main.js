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

iot_server = window.config.iot_deviceOrg + ".messaging.internetofthings.ibmcloud.com";
iot_port = 1883;
iot_username = window.config.iot_apiKey;
iot_password = window.config.iot_apiToken;
iot_clientid = "a:"+window.config.iot_deviceOrg+":tester" + Math.floor(Math.random() * 1000); 

client = new Messaging.Client(iot_server, iot_port, iot_clientid);

client.connect({
	userName: iot_username,
	password: iot_password,
	onSuccess: function() { $("body").append("<br><br><i>Connected to IoT Foundation!</i><br><div id='statusMessage'></div>") }
});

$("#button").on("click", function() {
	var id = $("#id").val();
	var message = $("#message").val();

	var payload = {
		id: id,
		text: message,
		duration: 5000
	};

	var message = new Messaging.Message(JSON.stringify(payload));
	message.destinationName = "iot-2/type/api/id/tester/cmd/addOverlay/fmt/json";
	$("#statusMessage").html("Published command!<br><br><b>Topic: </b>" + message.destinationName + "<br><b>Payload: </b><pre>" + JSON.stringify(payload, null, 4) + "</pre>");
	$("#statusMessage").css("display", "block");
	client.send(message);
});

$("#propButton").on("click", function() {
	var id = $("#prop_id").val();
	var property = $("#property").val();
	var value = $("#value").val();

	var payload = {
		id: id,
		property: property,
		value: value
	};

	var group = id.split("-")[0];
	var num = id.split("-")[1];

	var message = new Messaging.Message(JSON.stringify(payload));
	message.destinationName = "iot-2/type/"+window.config.iot_deviceType+"/id/"+id.split("-")[0]+"/cmd/setProperty/fmt/json";
	$("#statusMessage").html("Published command!<br><b>Topic: </b>" + message.destinationName + "<br><b>Payload: </b><pre>" + JSON.stringify(payload, null, 4) + "</pre>");
	$("#statusMessage").css("display", "block");
	client.send(message);
});


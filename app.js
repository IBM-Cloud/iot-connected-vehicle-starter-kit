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

var parseString = require('xml2js').parseString;
var vincenty = require('node-vincenty');
var fs = require('fs');
var argv = require('optimist').argv;
var mqtt = require('mqtt');
var http = require('http');
var settings = require('./public/config/settings');
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
var appHost = appInfo.host || "localhost";

console.log(argv);

var deviceIndex = (appInfo && appInfo.instance_index) ? appInfo.instance_index : 0;
var deviceId = settings.iot_deviceSet[deviceIndex].deviceId;
var token = settings.iot_deviceSet[deviceIndex].token;

var iot_server = settings.iot_deviceOrg + ".messaging.internetofthings.ibmcloud.com";
var iot_port = 1883;
var iot_username = "use-token-auth";
var iot_password = token;
var iot_clientid = "d:" + settings.iot_deviceOrg + ":" + settings.iot_deviceType + ":" + deviceId

console.log(iot_server, iot_clientid, iot_username, iot_password);
var client = mqtt.createClient(1883, iot_server, { clientId: iot_clientid, username: iot_username, password: iot_password });

console.log(JSON.stringify(process.env));
var VEHICLE_COUNT = (argv.count ? argv.count : (process.env.VEHICLE_COUNT || 1));

console.log("Simulating " + VEHICLE_COUNT + " vehicles");

// subscribe
var propertyTopic = "iot-2/cmd/setProperty/fmt/json";

// publish
var telemetryTopic = "iot-2/evt/telemetry/fmt/json";


//////////////////
//      MAP     // 
//////////////////
var num_nodes = 0;
var num_edges = 0;

var map = {
	nodes: {},
	edges: {}
};

function Map(abbr, name, filename) {
	this.abbr = abbr;
	this.name = name;
	this.nodeCount = 0;
	this.edgeCount = 0;
	this.nodes = {};
	this.edges = {};
	this.loadFromFile(filename);
}
Map.prototype.loadFromFile = function(filename) {
	fs.readFile(filename, (function(map) {
		return function(err, data) {
			if (err) throw err;
			parseString(data, function(err, result) {
				console.log("parseString");
				if (err) throw err;
				map.createMapFromJSON(result);
				setTimeout(mapLoaded, 5000);
			});
		}
	})(this));
}
Map.prototype.createMapFromJSON = function(json) {
	console.log("createMapFromJSON");
	for (var i in json.osm.node) {
		var n = json.osm.node[i];
		this.nodes[n.$.id] = {
			id: n.$.id,
			lon: parseFloat(n.$.lon),
			lat: parseFloat(n.$.lat),
			edges: Array()
		}
		this.nodeCount++;
		if (this.nodeCount % 1000 == 0) { console.log("nodes: " + this.nodeCount); }
	}
	for (var i in json.osm.way) {
		var w = json.osm.way[i];
		var wId = w.$.id;
		
		var tags = {};
		for (var j in w.tag) {
			tags[w.tag[j].$.k] = w.tag[j].$.v;
		}

		var last_ref = null;
		for (var j in w.nd) {
			var ref = w.nd[j].$.ref;  // node id
			if (last_ref) {
				//console.log(this.nodes[last_ref], this.nodes[ref]);
				var res = vincenty.distVincenty(this.nodes[last_ref].lat, this.nodes[last_ref].lon, this.nodes[ref].lat, this.nodes[ref].lon);
				//console.log(res);
				var meters = res.distance;
				var bearing = res.initialBearing;
				if (tags.oneway && tags.oneway == "yes") {
					var edge = {
						id: wId + "-" + last_ref + "_" + ref,
						type: tags.highway,
						a: last_ref,
						b: ref,
						heading: bearing,
						dist: meters
					};
					this.edges[edge.id] = edge;
					this.nodes[last_ref].edges.push(edge);
					this.edgeCount++;
				} else {
					var edgeA = {
						id: wId + "-" + last_ref + "_" + ref,
						type: tags.highway,
						a: last_ref,
						b: ref,
						heading: bearing,
						dist: meters
					}
					this.edges[edgeA.id] = edgeA;
					this.nodes[last_ref].edges.push(edgeA);
					this.edgeCount++;

					var edgeB = {
						id: wId + "-" + ref + "_" + last_ref,
						type: tags.highway,
						a: ref,
						b: last_ref,
						heading: (bearing < 180 ? bearing + 180 : bearing - 180),
						dist: meters
					}
					this.edges[edgeB.id] = edgeB;
					this.nodes[ref].edges.push(edgeB);
					this.edgeCount++;
				}
			}
			last_ref = ref;
		}
		if (this.edgeCount % 1000 == 0) { console.log("edges: " + this.edgeCount); }
	}

	var del = 0;
	for (var i in this.nodes) {
		var n = this.nodes[i];
		var count = 0;
		for (var j in n.edges) {
			if (this.nodes[n.edges[j].b]) {
				count++;
			}
		}
		if (count == 0) {
			delete this.nodes[i];
			del++;
			this.nodeCount--;
		}
	}
	//console.log("deleted " + del + " nodes");

	//this.publishData();
	this.print();
}
Map.prototype.print = function() {
	/*
	fs.writeFile("map_nodes.txt", JSON.stringify(this.nodes, null, 4), function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log("nodes saved to map_nodes.txt");
		}
	}); 
	fs.writeFile("map_edges.txt", JSON.stringify(this.edges, null, 4), function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log("edges saved to map_edges.txt");
		}
	}); 
	*/
	console.log("loaded map!");
	console.log("num_edges = " + this.edgeCount);
	console.log("num_nodes = " + this.nodeCount);
}

Map.prototype.publishData = function() {
	//var topic = topicPrefix + "map/"+this.abbr;
	var payload = JSON.stringify({
		name: this.name,
		abbr: this.abbr,
		nodeCount: this.nodeCount,
		edgeCount: this.edgeCount,
		nodes: this.nodes,
		edges: this.edges
	});
	var b64 = new Buffer(payload).toString('base64');
	//console.log("publish : " + topic + " : " + b64);
	console.log(b64);
	console.log("length = " + b64.length);
	//client.publish(topicPrefix + "map/"+ this.abbr, b64, { qos: 1, retain: true });
}

var austin_map = new Map("austin", "Austin - Downtown", "maps/austin_downtown-clean.osm");

function Vehicle(id, suffix) {
	this.id = id;
	this.suffix = suffix;
	this.name = "Car " + id + suffix;
	this.map = austin_map;
	this.speed = null;
	this.state = "normal";
	this.description = "I am a connected car.";
	this.type = "car";
	this.customProps = {
		turnSignal: "OFF"
	},

	this.geo = {
		lon: 0,
		lat: 0
	}

	this.currentEdge = null;
	this.perc = 0;  // % of edge travelled
	this.lastUpdateTime = null;

	this.setSpeed(30);
	this.frame = 0;
}
Vehicle.prototype.drive = function() {
	this.frame++;
	if (!this.currentEdge) {
		this.setStartingEdge();
	} else {
		//console.log("update " + this.name);
		this.update();
	}
}

Vehicle.prototype.update = function() {
	var delta = (new Date()).getTime() - this.lastUpdateTime;
	//console.log("delta = " + delta);

	// move car 'delta' milliseconds
	// speed (m/s) = speed (km/hr) * 3600 / 1000
	// dist (m) = speed (m/s) * (delta / 1000)
	var dist_to_move = (this.speed * (1000 / 3600)) * (delta / 1000);
	//console.log("updating vehicle: distance remaining = " + dist_to_move);

	while (dist_to_move > 0) {
		var dist_remaining_on_edge = (1.0 - this.perc) * this.currentEdge.dist;
		if (dist_to_move > dist_remaining_on_edge) {
			// finished an edge! get a new edge and keep going
			//console.log("finished an edge! distance remaining = " + dist_to_move);
			dist_to_move -= dist_remaining_on_edge;
			this.setNextEdge();
		} else {
			// didn't finish an edge, update perc
			this.perc += (dist_to_move / this.currentEdge.dist);
			dist_to_move = 0;
			//console.log("didn't finish, perc = " + this.perc);
		}
	}
	
	this.updatePosition();
	this.lastUpdateTime = (new Date()).getTime();
}

Vehicle.prototype.getPublishPayload = function() {
	return {
		id: this.id + this.suffix,
		name: this.name,
		lng: this.geo.lon.toString(),
		lat: this.geo.lat.toString(),
		heading: this.currentEdge.heading,
		speed: this.speed,
		state: this.state,
		description: this.description,
		type: this.type,
		customProps: this.customProps
	};
}

Vehicle.prototype.setSpeed = function(val) {
	// speed = km/hr
	if (val >= 0 && val <= 120) {
		console.log("setting speed to " + val);
		this.speed = val;
	}
}

Vehicle.prototype.setTurnSignal = function(val) {
	if (val == "LEFT" || val == "NONE" || val == "RIGHT" || val == "OFF") {
		this.customProps.turnSignal = val;
	}
}

Vehicle.prototype.setStartingEdge = function() {
	var keys = [];
	for (var i in this.map.edges) {
		keys.push(i);
	}
	this.currentEdge = this.map.edges[keys[Math.floor(Math.random() * keys.length)]];
	this.perc = 0;
	this.lastUpdateTime = (new Date()).getTime();
}

Vehicle.prototype.updatePosition = function() {
	var a = this.map.nodes[this.currentEdge.a];
	var b = this.map.nodes[this.currentEdge.b];
	if (a && b) {
		this.geo.lon = a.lon + this.perc * (b.lon - a.lon);
		this.geo.lat = a.lat + this.perc * (b.lat - a.lat);
	} else {
		//console.log("ERROR", a, b); 
		this.setStartingEdge();
	}
	//console.log("updatePosition: " + this.geo.lon + ", " + this.geo.lat);
}

Vehicle.prototype.setNextEdge = function() {
	//console.log("  setNextEdge");
	var n = this.map.nodes[this.currentEdge.b];
	if (!n) { 
		// no valid next edge 
		//console.log("RESPAWNING");
		this.setStartingEdge();
		return;
	}
	var edge = null;
	var reverseCount = 0;
	var leftTurnEdge = null, leftTurnAngle = 0;
	var rightTurnEdge = null, rightTurnAngle = 0;
	var straightEdge = null, straightAngle = 180;
	var a1 = this.currentEdge.heading;
	for (var i in n.edges) {
		var a2 = n.edges[i].heading;
		var left_diff = (a1-a2+360)%360;
		var right_diff = (a2-a1+360)%360;
		if (left_diff > leftTurnAngle && left_diff < 160) {
			leftTurnEdge = n.edges[i];
			leftTurnAngle = left_diff;
		}
		if (right_diff > rightTurnAngle && right_diff < 160) {
			rightTurnEdge = n.edges[i];
			rightTurnAngle = right_diff;
		}
		var smallest = Math.min(left_diff, right_diff);
		if (smallest < straightAngle) {
			straightEdge = n.edges[i];
			straightAngle = smallest;
		}
		console.log("possible edge: " + n.edges[i].id + " | heading: " + n.edges[i].heading + " | left_diff: " + left_diff + " | right_diff: " + right_diff);
	}
	console.log("-- LEFT edge: " + (leftTurnEdge ? leftTurnEdge.id : "(nil)") + " | angle: " + leftTurnAngle);
	console.log("-- RIGHT edge: " + (rightTurnEdge ? rightTurnEdge.id : "(nil)") + " | angle: " + rightTurnAngle);
	console.log("-- STRAIGHT edge: " + (straightEdge ? straightEdge.id : "(nil)") + " | angle: " + straightAngle);
	while (!edge) {
		try { 
			if (this.customProps.turnSignal && this.customProps.turnSignal == "LEFT" && leftTurnEdge) {
				console.log("trying LEFT turn: " + leftTurnEdge.id);
				edge = leftTurnEdge;
			} else if (this.customProps.turnSignal && this.customProps.turnSignal == "RIGHT" && rightTurnEdge) {
				console.log("trying RIGHT turn: " + rightTurnEdge.id);
				edge = rightTurnEdge;
			} else if (this.customProps.turnSignal && this.customProps.turnSignal == "STRAIGHT" && straightEdge) {
				console.log("trying STRAIGHT: " + straightEdge.id);
				edge = straightEdge;
			} else {
				console.log("trying RANDOM turn");
				var idx = Math.floor(Math.random() * n.edges.length);
				edge = n.edges[idx];
			}

			// check to make sure we didn't reverse direction if there are multiple edges
			console.log("checking edge: " + this.currentEdge.a + "  " + edge.b);
			if (this.currentEdge.a == edge.b) {
				if (n.edges.length == 1) {
					//console.log("End of the line!  Respawning...");
					this.setStartingEdge();
					return;
				} else { 
					//console.log("edge won't work, it's a reverse!");
					reverseCount++;
					if (reverseCount > 10) { 
						this.setStartingEdge();
						return;
					} else {
						edge = null;
					}
				}
			}
		} catch (e) { 
			console.log(e, "ERROR", n, this.currentEdge); 
			this.setStartingEdge();
			return;
		}
	}
	//console.log("new edge = ", edge);
	this.perc = 0;
	this.currentEdge = edge;
}


var vehicles = Array();
for (var i = 1; i <= VEHICLE_COUNT; i++) {
	var vid = deviceId;
	var suffix = "";
	if (VEHICLE_COUNT > 1) { suffix = "-" + i; }
	vehicles.push(new Vehicle(vid, suffix));
}
var bMapLoaded = false;

function drive() {
	for (var i in vehicles) {
		vehicles[i].drive();
	}
}

function subscribeToProperties() {
	client.subscribe(propertyTopic);
	console.log("subscribed to: " + propertyTopic);
	client.on('message', function(topic, message) {
		console.log("message recv: " + topic + " = " + message);
		try {
			//var id = topic.split("/")[3];
			var data = JSON.parse(message);
			var id = data.id;
			if (!id) { id = deviceId; }
			console.log("setProperty(id="+id+"): " + data.property + " = " + data.value);
			var v = getVehicle(id);
			var prop = data.property;
			var val = data.value;

			if (v) {
				if (prop == "lng" || prop == "lat" || prop == "heading" || prop == "id") { return; }
				switch (prop) {
					case "speed": v.setSpeed(val); break;
					case "state": v.state = val; break;
					case "description": v.description = val; break;
					case "type": v.type = val; break;
					default: 
						if (val == "") {
							if (v.customProps[prop]) { delete v.customProps[prop]; }
						} else {
							v.customProps[prop] = val;
						}
				}
			}
		} catch (e) { console.error(e); }
	});
}

function publishVehicleData() {
	var payload = [];
	for (var i in vehicles) {
		payload.push(vehicles[i].getPublishPayload());
	}
	//console.log("publishing data: " + telemetryTopic + " | " + JSON.stringify(payload));
	if (payload.length == 1) {
		client.publish(telemetryTopic, JSON.stringify(payload[0]));
	} else {
		client.publish(telemetryTopic, JSON.stringify(payload));
	}
}

function getVehicle(id) {
	for (var i in vehicles) {
		if ((vehicles[i].id + vehicles[i].suffix) == id) {
			return vehicles[i];
		}
	}
	return null;
}

function mapLoaded() {
	subscribeToProperties();
	setInterval(function() {
		drive();
		publishVehicleData();
	}, 200);
}


// setup middleware
var express = require('express'),
	http = require('http'),
	path = require('path');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

var geo_props = null;

//parse VCAP_SERVICES if running in Bluemix
if (process.env.VCAP_SERVICES) {
	var env = JSON.parse(process.env.VCAP_SERVICES);
	console.log(env);
	//find the Streams Geo service
	if (env["Geospatial Analytics"])
	{
		geo_props = env['Geospatial Analytics'][0]['credentials'];
		console.log(geo_props);
	}
	else
	{
		console.log('You must bind the Streams Geo service to this application');
	}
}

if (geo_props) { 

	// sample vehicle topic/payload:
	// {"id":"G-13","name":"Car G-13","lng":-122.41950721920685,"lat":37.76330689770606,"heading":177.06799545408498,"speed":30,"state":"normal","description":"I am a connected car.","type":"car","customProps":{"customProp":"customValue"}}

	var inputClientId = "a:"+settings.iot_deviceOrg + ":geoInput" + Math.floor(Math.random() * 1000);
	var notifyClientId = "a:"+settings.iot_deviceOrg + ":geoNotify" + Math.floor(Math.random() * 1000);

	var apis = [
		{ 
			name: "start", 
			path: geo_props.start_path,
			method: "PUT",
			json: {
				"mqtt_client_id_input" : inputClientId,
				"mqtt_client_id_notify" : notifyClientId,
				"mqtt_uid" : settings.iot_apiKey,
				"mqtt_pw" : settings.iot_apiToken,
				"mqtt_uri" :  settings.iot_deviceOrg + ".messaging.internetofthings.ibmcloud.com:1883",
				"mqtt_input_topics" : settings.inputTopic,
				"mqtt_notify_topic" : settings.notifyTopic,
				"device_id_attr_name" : "id",
				"latitude_attr_name" : "lat",
				"longitude_attr_name" : "lng"
			}
		},
		{ 
			name: "stop", 
			path: geo_props.stop_path,
			method: "PUT",
			json: null
		},
		{ 
			name: "addRegion", 
			path: geo_props.add_region_path,
			method: "PUT",
			json: {  // sample JSON for adding a region
				"regions" : [
					{
						"region_type": "custom",
						"name": "custom_poly",
						"notifyOnExit": "true",
						"polygon": [
							{"latitude": "30.27830", "longitude": "-97.74316"},
							{"latitude": "30.27617", "longitude": "-97.73573"},
							{"latitude": "30.26676", "longitude": "-97.73917"},
							{"latitude": "30.26852", "longitude": "-97.74560"}
								// an edge is drawn between last and first points to close the poly
						]
					}
				]
			}
		},
		{ 
			name: "removeRegion", 
			path: geo_props.remove_region_path,
			method: "PUT",
			json: {  // sample JSON for removing the sample region
				"region_type": "custom",
				"region_name": "custom_poly"
			}
		},
		{ 
			name: "restart", 
			path: geo_props.restart_path,
			method: "PUT",
			json: null
		},
		{ 
			name: "status", 
			path: geo_props.status_path,
			method: "GET",
			json: null
		},
	]

	// build routes
	for (var i in apis) {
		var route = "/GeospatialService_"+apis[i].name;

		console.log("Creating route: " + route);

		app.get(route, (function(api) {
			return function(request, response) {
				var route = "/GeospatialService_"+api.name;
				console.log("About to call " + route);  


				// prepare options
				var options = {
					host: geo_props.geo_host,
					port: geo_props.geo_port,
					path: api.path,
					method: api.method,
					headers: {
						'Authorization' : ('Basic ' + new Buffer(geo_props.userid + ':' + geo_props.password).toString('base64'))
					}
				};

				// start by loading sample JSON
				var bodyJson = api.json;

				// if we pass in query parameters, overwrite the sample JSON with this information
				if (request.query && Object.keys(request.query).length > 0) {
					console.log("BODY: ", request.query);
					bodyJson = request.query;
				} else {
					console.log("NO BODY");
				}

				if (bodyJson) {
					options.headers['Content-Type'] = 'application/json';
					options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(bodyJson), 'utf8');
				}
				 
				console.log('Options prepared:', options);
				console.log('Do the GeospatialService_' + api.name + ' call');
				 
				// do the PUT call
				var reqPut = http.request(options, function(res) {

					// uncomment it for header details
					console.log("headers: ", res.headers);
					console.log("statusCode: ", res.statusCode);
				 
					res.on('data', function(d) {
						console.log(route + ' result:\n');
						process.stdout.write(d);
						var result = JSON.parse(d.toString());
						console.log("\n" + route + ' completed');
						console.log("statusCode: ", res.statusCode);
						console.log("result:\n", result);
						response.send(res.statusCode, result);
					});
					if (res.statusCode != 200) {
						runError = 1;
					}
				});

				if (bodyJson) {
					// write the json data
					console.log('Writing json:\n', JSON.stringify(bodyJson, null, 4));
					reqPut.write(JSON.stringify(bodyJson));
				}
				reqPut.end();
				reqPut.on('error', function(e) {
					console.error(e);
				});
			}
		})(apis[i]));
	}
}


http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

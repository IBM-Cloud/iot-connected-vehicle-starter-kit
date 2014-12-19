
# Connected Vehicle Starter Kit
-----
## Introduction
The "Connected Vehicle Starter Kit" consists of three applications:
1. A Node.js connected vehicle simulator
2. An OpenLayers HTML5 map application
3. An HTML5 tester application to send commands

The applications use IBM IoT Foundation for real-time publish/subscribe messaging, using the MQTT protocol.  The simulated devices (vehicles) publish telemetry data frequently (5 msgs/sec) and subscribe to a command topic whereby they accept commands from the tester application (ex. set speed to 60).  The Map app subscribes to the vehicle telemetry topic in order to display position and status in real-time.  The Tester app allows you to publish control commands to the vehicles and notifications to the Map app.

![Messaging][pic messaging]

## Getting started

### 1. Bluemix
If you do not already have an IBM Bluemix account, visit http://www.bluemix.net to sign up for an account.  The basic account is free for 30 days, and provides enough compute resources to run this tutorial.  Once the account request is submitted, you will receive a confirmation email within 1-2 minutes.

### 2. Internet of Things Foundation

- From your Bluemix dashboard, select **Add a Service**.

![pic iot 1]

- Choose **Internet of Things** from the service list.

![pic iot 2]

- Provide a service name that you will recognize later (ex. iot-trafficsim) — this service represents an **organization** in IoT Foundation, which is a shared space where devices and applications can securely connect and share data.  The service name you enter here is just for your reference, you will not collide with other users with the name iot-trafficsim.

- Press **Create** to add the service.  After the service is loaded, you will see the service information page with instructions and documentation for registering devices.  

- Click the **Launch** button in the top-right corner of the page to access your IoT organization dashboard.

![pic iot 4]

- From the dashboard, you will be able to manually register devices, generate API keys for applications, and invite others to your organization.

### 3. Configure (IoT Foundation)

The Connected Vehicle simulator uses IoT Foundation for near real-time messaging between simulated vehicles (devices) and the Map and Tester apps (applications).  To facilitate this communication, you first have to register the devices and generate an API key for the applications.

#### 3.1 Register devices

The vehicle simulator allows you to model multiple vehicles from a single Node.js runtime instance.  Each vehicle simulator will be treated as a **device** by IoT Foundation.  You will eventually run 3 vehicle simulators, so the first step is to manually register these simulators to obtain access credentials.

>> REST APIs for device registration with IoT Foundation are also [available](https://developer.ibm.com/iot/recipes/api-documentation/#registerDevice)

* From the organization dashboard's Devices tab, select **Add Device**.  In the Device Type dropdown, select **Create a device type...** and enter **vehicle** in the field below.  Choose a device ID of any length that will be unique to this organization (ex. ABC, DEF, GHI) and select **Continue**.

![pic iot 6]

* The next screen will show you credentials for your device.  For example:


    org=o4ze1w
    type=vehicle
    id=ABC
    auth-method=token
    auth-token=5QK1rWHG9JhDw-rs+S

* Save this information in a file as you will need these credentials later.  

* Now create two more devices and also save the credentials.  Note that when creating the first device, create a "type" of **vehicle**, so you can select that from the Device Type dropdown when creating subsequent devices.  For example, the other two device credentials may be:


    org=o4ze1w
    type=vehicle
    id=DEF
    auth-method=token
    auth-token=Q7QmQ*!jQn6NUF&rA4
    
    org=o4ze1w
    type=vehicle
    id=GHI
    auth-method=token
    auth-token=4O_FET9iLe(4bK!))z


#### 3.2 Generate an API key

You next will generate an API key for your organization.  An API key provides credentials for any application (i.e. not a device) to connect to IoT Foundation using an MQTT client.

* From your organization dashboard, click on the API Keys tab and select **New API Key**.

* Copy down the key and token, for example:


    Key:        a-o4ze1w-b7xr3coycy
    Auth Token: d4QD9Y@LcbrshlCD7q


* Again, save the key and token in a file as you will need them later.

* On the API Keys tab, you will see a new table row for the key you just created.  Add a comment to the key to associate this with the Connected Vehicle application.

![pic iot 8]


### 4. Configure (Starter Kit)

* Clone this repository to your local machine.

* Choose a globally unique application name for used in Bluemix deployment (ex. **bryancboyd-trafficsim**)

* Enter this name for the **host** and **name** fields in  [manifest.yml](https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/manifest.yml) and set the number of instances to **3**.


    applications:
    - host: bryancboyd-trafficsim
      disk: 128M
      name: bryancboyd-trafficsim
      command: node app.js
      path: .
      domain: mybluemix.net
      memory: 128M
      instances: 3


* All configuration for IoT Foundation is found in [public/config/settings.js](https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/public/config/settings.js).  This file is shared by the Node.js vehicle simulator and the Map and Tester apps, and stores all device tokens and API keys.

  * For **iot_deviceType**, enter **vehicle**
  * For **iot_deviceOrg**, enter your 6-character organization ID (ex: **o4ze1w**)
  * For **iot_deviceSet**, enter the three device ID and tokens you registered
  * For **iot_apiKey**, enter the API key your created
  * For **iot_apiToken**, enter the API key token
 

### 5. Deploy to Bluemix

To deploy the Connected Vehicle application to Bluemix, use the Cloud Foundry [command line tools](https://github.com/cloudfoundry/cli#downloads).

##### Push the application to Bluemix

* From the terminal, change to the root directory of this project and type:


    cf login


* Follow the prompts, entering **https://api.ng.bluemix.net** for the API endpoint, and your Bluemix IBM ID email and password as login credentials.  If you have more than one Bluemix organization and space available, you will also have to choose these.  Next, enter:


    cf push
    
    
* IF the application does not start successfully, view the error logs:


    cf logs <your app name> --recent
    
    
* Check manifest.yml for errors, such as tabs in place of whitespace.

* Now, visit the Map app at your URL: **http://APP_NAME.mybluemix.net**.  You will see the simulated vehicles moving across the map.  Click on a vehicle to view the telemetry data.

![pic map 1]

##### Increase the vehicle count per simulator

Each vehicle simulator can model multiple vehicles.  The number of vehicles is controlled by a Bluemix environment variable, which can be set from the Bluemix application dashboard.

* In the dashboard, click on the **SDK for Node.js** icon

![pic vehicle count 1]

* Add a USER-DEFINED variable **VEHICLE_COUNT**, and select a value of 5.

![pic vehicle count 2]

* Notice that the change was applied dynamically and the number of cars on the map increases.


### 6. Use the Tester app

The Tester app is used to send commands to the simulated vehicles and the Map app.  The vehicle simulator subscribes to commands of type **setProperty** and will dynamically change its own properties, speed, and state.  The Map app subscribes to commands of type **addOverlay** and will dynamically display a popup of text over a vehicle.

* Open the Map app and Tester app (http://APP_NAME.mybluemix.net/tester) side-by-side, so that you can see both windows.

##### 7.1  **setProperty** API

* Select a vehicle, then enter the ID in the second form on the Tester page.
* Enter a property of **speed** and a value of 120, and press **Update Property**.  An MQTT message will be published from the Tester app (topic and payload on screen), and the vehicle you chose will receive the message and change speed to 120 km/hr.

![pic set property 1]

The vehicles simulate a set of **static properties** (location, speed, state, and type) and **custom properties**.  The **setProperty** API allows you to dynamically add/change/delete a custom property on a vehicle.

* To add a property, simply publish a property that doesn't yet exist.  For example, use property **driverWindow** and value **UP**:

![pic set property 2]

* To delete a property, update the property with an empty value; the vehicle will cease including the property in its telemetry message.

##### 7.2  **addOverlay** API

The Map app subscribes to commands of type **addOverlay**, to allow external applications to display messages on the map over a vehicle.

* In the Tester app, use the upper form to display a message over a vehicle, for example:

![pic add overlay 1]

## Next Steps - Geospatial and Node-RED

The application can be extended with the Bluemix Geospatial Service and [Node-RED](www.nodered.org).  Read Sections 8 and 9 in this [tutorial](http://m2m.demos.ibm.com/dl/iot-connected-vehicle-tutorial.pdf).

[MQTT]:http://mqtt.org
[Iot Foundation]:http://internetofthings.ibmcloud.com
[pic messaging]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/messaging.png
[pic iot 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot1.png
[pic iot 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot2.png
[pic iot 3]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot3.png
[pic iot 4]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot4.png
[pic iot 5]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot5.png
[pic iot 6]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot6.png
[pic iot 7]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot7.png
[pic iot 8]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/iot8.png
[pic config 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/config1.png
[pic map 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/map1.png
[pic vehicle count 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/vehicle_count1.png
[pic vehicle count 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/vehicle_count2.png
[pic set property 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/set_property1.png
[pic add overlay 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/add_overlay1.png
[pic set property 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/set_property2.png
[pic geospatial 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/geospatial1.png
[pic geospatial 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/geospatial2.png
[pic geospatial 3]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/geospatial3.png
[pic geospatial 4]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/geospatial4.png
[pic node red 0]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red0.png
[pic node red 1 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red1_1.png
[pic node red 1 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red1_2.png
[pic node red 1 3]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red1_3.png
[pic node red 2 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red2_1.png
[pic node red 2 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red2_2.png
[pic node red 2 3]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red2_3.png
[pic node red 2 4]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red2_4.png
[pic node red 3 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red3_1.png
[pic node red 3 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red3_2.png
[pic node red 3 1]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red4_1.png
[pic node red 4 2]:https://github.com/ibm-messaging/iot-connected-vehicle-starter-kit/blob/master/docs/node_red4_2.png

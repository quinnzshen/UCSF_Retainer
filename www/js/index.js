/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
'use strict';

var retainer = {
    service: "61744710-a6e8-11e2-9e96-0800200c9a66",
    xgatt_id: "c5991711-0d5f-47f9-9b09-3814332a11ac",
    xgatt_celsius: "4243ab10-502d-48e6-af3a-14c07569febc",
    xgatt_temperature: "3ca692d0-b9a8-11e2-9e96-0800200c9a66",
    xgatt_readidx: "be2e55a0-a6e7-11e2-9e96-0800200c9a66",
    xgatt_writeidx: "c3b2d730-a6e7-11e2-9e96-0800200c9a66",
    xgatt_dataout1: "d3d7d610-a6e7-11e2-9e96-0800200c9a66",
    xgatt_dataout2: "d3d7d611-a6e7-11e2-9e96-0800200c9a66",
    xgatt_dataout3: "d3d7d712-a6e7-11e2-9e96-0800200c9a66",
    xgatt_overwrite: "128d63d0-d3ba-11e2-8b8b-0800200c9a66",
    xgatt_restore: "ba9de407-f0fd-4422-b617-030c4bf1a5aa",
    xgatt_time: "d3d7d618-a6e7-11e2-9e96-0800200c9a66",
    xgatt_loggertype: "67a9483c-8756-48e8-87c2-82c8aaff9242"
};

var device_uuid;
var temperatures = [];
var notifying = false;

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
        this.showMainPage();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);

        refreshButton.addEventListener('touchend', this.refreshDeviceList, false);
        deviceList.addEventListener('touchend', this.connect, false);

        readTemperatureButton.addEventListener('touchend', this.readTemperature, false);
        disconnectButton.addEventListener('touchend', this.disconnect, false);
        notifyTemperatureButton.addEventListener('touchend', this.toggleNotifyTemperature, false);
        console.log("Done Binding Events");
    },
    onDeviceReady: function() {
        app.refreshDeviceList();
    },
    refreshDeviceList: function() {
        deviceList.innerHTML = '';
        ble.scan([], 5, app.onDiscoverDevice, app.onError);
    },
    onDiscoverDevice: function(device) {

        console.log(JSON.stringify(device));
        var listItem = document.createElement('li'),
            html = '<b>' + device.name + '</b><br/>' +
            'RSSI: ' + device.rssi + '&nbsp;|&nbsp;' +
            device.id;

        listItem.dataset.deviceId = device.id;
        listItem.innerHTML = html;
        deviceList.appendChild(listItem);

    },
    connect: function(e) {
        console.log(JSON.stringify(e.target.dataset));
        device_uuid = e.target.dataset.deviceId;
        var deviceId = e.target.dataset.deviceId,
            onConnect = function() {
                console.log('Connected :)!');
                disconnectButton.dataset.deviceId = deviceId;
                app.showDetailPage();
            };

        ble.connect(deviceId, onConnect, app.onError);
    },
    disconnect: function(event) {
        var deviceId = event.target.dataset.deviceId;
        ble.disconnect(deviceId, app.showMainPage, app.onError);
    },
    readTemperature: function(event) {
        console.log("Calling readTemperature");
        console.log("Retainer Service: " + retainer.service);
        console.log("xgatt_temperature Characteristic: " + retainer.xgatt_temperature);
        console.log("Retainer UUID: " + device_uuid);
        ble.read(device_uuid, retainer.service, retainer.xgatt_temperature, app.onTemperatureRead, app.onError);
    },
    toggleNotifyTemperature: function(e) {
        if (!notifying) {
            console.log("Registering Notification for xgatt_temperature Characteristic");
            ble.startNotification(device_uuid, retainer.service, retainer.xgatt_temperature, function(data) {
                if (!notifying) {
                    notifying = true;
                    notifyTemperatureButton.innerHTML = "Stop Notifications";
                    console.log("Started Notifications");
                }
                app.onTemperatureRead(data);
            }, app.onError);
        } else{
            console.log("Unregistering Notification for xgatt_temperature Characteristic");
            ble.stopNotification(device_uuid, retainer.service, retainer.xgatt_temperature, function() {
                notifying = false;
                notifyTemperatureButton.innerHTML = "Start Notifications";
                console.log("Stopped Notifications");
            }, app.onError);
        };
    },
    onTemperatureRead: function(data) {
        var rawTemperature, numTemperature, celsius;
        rawTemperature = new Uint16Array(data);
        numTemperature = parseInt(rawTemperature[0],10);
        celsius = ((numTemperature / 16) - 1335) * (1150 / 4096);
        console.log(celsius + " celsius");
        temperatureValue.innerHTML = celsius.toString().substring(0,7) + "&ordm;C";
        temperatures.push(celsius);
        temperatureList.innerHTML = temperatures.join("<br/>");
    },
    bytesToString: function(buffer) {
        return String.fromCharCode.apply(null, new Uint8Array(buffer));
    },
    stringToBytes: function(string) {
        var array = new Uint8Array(string.length);
        for (var i = 0, l = string.length; i < l; i++) {
            array[i] = string.charCodeAt(i);
        }
        return array.buffer;
    },
    showMainPage: function() {
        console.log("Showing Main Page");
        mainPage.hidden = false;
        detailPage.hidden = true;
        // $("#mainPage").show();   // jQuery Equivalent
        // $("#detailPage").hide();
    },
    showDetailPage: function() {
        console.log("Showing Detail Page");
        mainPage.hidden = true;
        detailPage.hidden = false;
        // $("#mainPage").hide();
        // $("#detailPage").show();
        temperatureValue.innerHTML = "---&ordm;C";
        temperatures = [];
        temperatureList.innerHTML = "";
    },
    onError: function(reason) {
        alert("ERROR: " + reason); // TODO: Eventually use notification.alert
    }
};

app.initialize();
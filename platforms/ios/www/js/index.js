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
    level: "3ca692d0-b9a8-11e2-9e96-0800200c9a66"
};

var device_id;

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
        detailPage.hidden = true;
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        refreshButton.addEventListener('touchstart', this.refreshDeviceList, false);
        temperatureButton.addEventListener('touchstart', this.readTemperature, false);
        disconnectButton.addEventListener('touchstart', this.disconnect, false);
        deviceList.addEventListener('touchstart', this.connect, false);
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
        device_id = e.target.dataset.deviceId;
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
        console.log(retainer.service);
        console.log(retainer.level);
        console.log(device_id);
        ble.read(device_id, retainer.service, retainer.level, app.onTemperatureRead, app.onError);
    },
    onTemperatureRead: function(data) {
        console.log(data);
        var hex_data = new Uint16Array(data);
        console.log('uint16_lil ' + hex_data.toString(16));
        hex_data = convert_endian(hex_data);
        console.log('initial ' + hex_data.toString(16));
        hex_data = convert_endian(hex_data);
        console.log('large_end ' + hex_data.toString(16));

        var temp_data = parseInt(hex_data.toString(16), 16);
        console.log(temp_data);
        temp_data = ((temp_data / 16) - 1335) * (1150 / 4096);
        console.log(temp_data);
        deviceTemperature.innerHTML = temp_data + ' Celsius';
    },
    showMainPage: function() {
        mainPage.hidden = false;
        detailPage.hidden = true;
    },
    showDetailPage: function() {
        mainPage.hidden = true;
        detailPage.hidden = false;
    },
    onError: function(reason) {
        alert("ERROR: " + reason); // TODO: Eventually use notification.alert
    }
};

function convert_endian(val) {
    return ((val & 0xFF) << 8) | ((val >> 8) & 0xFF);
}

app.initialize();
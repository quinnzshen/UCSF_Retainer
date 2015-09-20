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
    // 4243AB10-502D-48E6-AF3A-14C07569FEBC - CELCIUS
    // 14343C30-EFC5-6251-5E23-0B3ADCB6E4F0 - DEVICE?
    // service: "61744710-A6E8-11E2-9E96-0800200C9A66",
    // level: "3CA692D0-B9A8-11E2-9E96-0800200C9A66"
    service: "61744710-a6e8-11e2-9e96-0800200c9a66",
    level: "3ca692d0-b9a8-11e2-9e96-0800200c9a66"
};

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
        var deviceId = event.target.dataset.deviceId;
        console.log(deviceId);
        ble.read("00:07:80:A4:7C:B8", retainer.service, retainer.level, app.onTemperatureRead, app.onError);
    },
    onTemperatureRead: function(data) {
        console.log(data);
        var message;
        var displayedData = new uint8Array(data);
        deviceTemperature.innerHTML = "Testing innerHTML."
        // deviceTemperature.innerHTML = displayedData[0] + ' Celcius';
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

app.initialize();
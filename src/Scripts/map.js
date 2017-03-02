"use strict";

$(window).load(function () {
    // define map variable
    var map = null;
    
    var policyData = null;
    var policyDataSnapshot = null;
    var policyUndoData = null;;

    var proximityData = null;

    var riskGroupData = null;
    var riskGroupDataInitial = null;

    var riskGroupBuildingData = null;
    var riskGroupBuildingDataInitial = null;

    var currentPolicyNumber = null;

    // initialize the application
    initialize();

    // define functions
    function initialize() {
        initializeBuildingDataTable();
        initializeGroupDataTable();
        initializeGroupBuildingDataTable();

        initializeDOMEvents();
        initializeAjax();

        initializeMap();
        initializeSearchBox();
        initializeMapEvents();

        policyUndoData = new google.maps.Data();
        riskGroupDataInitial = new google.maps.Data();
        riskGroupBuildingDataInitial = new google.maps.Data();

        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
            if (e.currentTarget.id == "group-tab") {
                if (riskGroupData == null) {
                    getRiskGroup(currentPolicyNumber);
                }
            }
        });

        // $('#search-value').val('9145693');
        if ($('#search-value').val()) {
            $('#search').click();
        }
    }

    function initializeBuildingDataTable() {
        var table = $('#building-list').DataTable({
            scrollY: 200,
            scrollCollapse: false,
            bSort: false,
            pagingType: 'full',
            lengthMenu: [ [5, 10, 20, 50, -1], [5, 10, 20, 50, "All"] ],
            columns: [
                { data: 'id', 'visible': false, 'searchable': false},
                { data: 'address', 'width': '80%'},
                {// this is the edit / cancel link - this function runs when a row is being added.
                   'width': '10%',
                    mRender: function (data, type, row) {
                        var element = '<input type="button" id="ok' + row.id + '" class="feature-edit feature-edit-edit" value="Edit">';
                        return element;
                    }
                },
                {// this is the edit / cancel link - this function runs when a row is being added.
                   'width': '10%',
                    mRender: function (data, type, row) {
                        //var link = '<a id="undo' + row.id + '" href="#" class="feature-edit feature-edit-undo">Undo</a>';
                        var element = '<input type="button" id="undo' + row.id + '" class="feature-edit feature-edit-undo" value="Undo" disabled>';
                        return element;
                    }
                }
            ],
            rowId: 'id',
            select: {
                style: 'single',
                //selector: 'td:first-child',
                blurable: false,
                items: 'row',
                info: false
            },
            scroller: false,
            processing: true
        });

        table.on('user-select', function (e, dt, type, cell, originalEvent) {
            if (type === "row") {
                var row = cell[0][0].row;
                //var col = cell[0][0].column;

                var origRowId = getSelectedRowId();
                var newRowId = dt.row(row).data().id;

                var target = $(originalEvent.currentTarget.childNodes['0']);
                var feature = null;
                var featureUndo = null;

                // don't deselect a currently selected row
                if (origRowId == newRowId) {
                    if (target.hasClass('feature-edit-edit')) {
                        target.val('Ok');
                        target.switchClass('feature-edit-edit', 'feature-edit-ok');

                        $('.feature-edit-edit').not('#ok' + newRowId).prop('disabled', true);
                        $('#undo' + newRowId).prop('disabled', false);

                        policyData.setStyle(getPolicyDataLayerStyle(false, false, false));
                        feature = policyData.getFeatureById(newRowId);

                        // save the feature for undo
                        featureUndo = new google.maps.Data.Feature({ geometry: feature.getGeometry(), id: feature.getId(), properties: { buildingId: "", area: "", pmlValue: "", contructionType: "" } });
                        copyFeatureProperties(feature, featureUndo);
                        policyUndoData.add(featureUndo);

                        // put feature in edit mode
                        selectFeature(feature);
                        setFeatureEditMode(feature, true);

                        // display save / cancel
                        showSaveCancel(true);
                    }
                    else if (target.hasClass('feature-edit-ok')) {
                        // Save the edit
                        target.val('Edit');
                        target.switchClass('feature-edit-ok', 'feature-edit-edit');

                        $('#undo' + newRowId).prop('disabled', true);
                        $('.feature-edit-edit:disabled').prop('disabled', false);

                        feature = policyData.getFeatureById(newRowId);
                        setFeatureEditMode(feature, false);
                        selectFeature(feature);

                        feature.setProperty('isDirty', 'true');

                        //debugFeatureGeoJson(feature);

                        featureUndo = policyUndoData.getFeatureById(newRowId);
                        policyUndoData.remove(featureUndo);

                        showSaveCancel(true);
                    }
                    else if (target.hasClass('feature-edit-undo')) {
                        $('#ok' + newRowId).switchClass('feature-edit-ok', 'feature-edit-edit');
                        $('#ok' + newRowId).val('Edit');

                        $('#undo' + newRowId).prop('disabled', true);
                        $('.feature-edit-edit:disabled').prop('disabled', false);

                        // undo feature
                        featureUndo = policyUndoData.getFeatureById(newRowId);

                        policyData.add(featureUndo);

                        policyUndoData.remove(featureUndo);

                        setFeatureEditMode(featureUndo, false);
                        selectFeature(featureUndo);
                    }
                    e.preventDefault();
                }
                else {
                    // validate the row original data
                    if (validateRow(origRowId) == false) {
                        e.preventDefault();
                        return;
                    }

                    if (target.hasClass('feature-edit-edit')) {
                        target.val('Ok');
                        //target.switchClass('feature-edit-edit', 'feature-edit-ok');
                        target.removeClass('feature-edit-edit');
                        target.addClass('feature-edit-ok');

                        $('.feature-edit-edit').not('#ok' + newRowId).prop('disabled', true);
                        $('#undo' + newRowId).prop('disabled', false);

                        policyData.setStyle(getPolicyDataLayerStyle(false, false, false));
                        feature = policyData.getFeatureById(newRowId);

                        // save the feature for undo
                        featureUndo = new google.maps.Data.Feature({ geometry: feature.getGeometry(), id: feature.getId(), properties: { buildingId: "" } });
                        copyFeatureProperties(feature, featureUndo);
                        policyUndoData.add(featureUndo);

                        // display save / cancel
                        showSaveCancel(true);
                    }
                }
            }

            return;
        });
        table.on('select', function (e, dt, type, indexes) {
            if (type === "row"); {
                var id = dt.row(indexes[0]).data().id;
                var feature = policyData.getFeatureById(id);
                selectFeature(feature);

                // TODO: Find a more elegant way to do this.  This is duplicated code
                // test if the ok button is being shown
                if ($('.feature-edit-ok').length) {
                    setFeatureEditMode(feature, true);
                }
            }
        });
        table.on("dblclick", "tr", function () {
            zoomToFeature(getSelectedFeature());
        });
    }
    function initializeGroupDataTable() {
        var table = $('#group-list').DataTable({
            scrollY: 200,
            scrollCollapse: false,
            bSort: false,
            pagingType: 'full',
            lengthMenu: [[5, 10, 20, 50, -1], [5, 10, 20, 50, "All"]],
            columns: [
                { data: 'id', 'visible': true, 'searchable': true, 'width': '30%' },
                { data: 'pmlValue', 'width': '70%' },
            ],
            rowId: 'id',
            select: {
                style: 'single',
                blurable: false,
                items: 'row',
                info: false
            },
            scroller: false
        });

        table.on('user-select', function (e, dt, type, cell, originalEvent) {
            if (type === "row") {
                var row = cell[0][0].row;
                //var col = cell[0][0].column;
                debugger;
                var origRowId = getSelectedGroupRowId();
                var newRowId = dt.row(row).data().id;

                // remove all of the features from the map
                riskGroupData.forEach(function (feature) {
                    riskGroupData.remove(feature);
                });

                if (origRowId === newRowId) {
                    addRiskGroupBuildingRows(null);
                }
                else {
                    // Add the feature if the row is being selected (as opposed to unselected)
                    riskGroupData.add(riskGroupDataInitial.getFeatureById(newRowId));
                    addRiskGroupBuildingRows(newRowId);
                }
            }
            return;
        });
    }
    function initializeGroupBuildingDataTable() {
        var table = $('#group-building-list').DataTable({
            scrollY: 200,
            scrollCollapse: false,
            bSort: true,
            pagingType: 'full',
            lengthChange: false,
            columns: [
                { data: 'id', 'visible': false, 'searchable': false, 'orderable': false },
                { data: 'policyId', 'visible': false, 'searchable': true, 'orderable': true },
                { data: 'address', 'width': '80%', 'orderable': false },
                { data: 'pmlValue', 'width': '20%', 'orderable': false }
            ],
            rowId: 'id',
            select: {
                style: 'multi',
                blurable: false,
                items: 'row',
                info: false
            },
            scroller: false,
            searching: false,
            drawCallback: function ( settings ) {
                var api = this.api();
                var rows = api.rows( {page:'current'} ).nodes();
                var last = null;
 
                api.column(1, {page:'current'} ).data().each( function ( group, i ) {
                    if ( last !== group ) {
                        $(rows).eq( i ).before(
                            '<tr class="group"><td colspan="4">' + group + '</td></tr>'
                        );
                        last = group;
                    }
                } );
            },
            order: [[1, 'asc']],
        });

        table.on('user-select', function (e, dt, type, cell, originalEvent) {
            if(type === "row") {
                var row = cell[0][0].row;
                //var col = cell[0][0].column;

                    //var origRowId = getSelectedRowId();
                        //var newRowId = dt.row(row).data().id;

                    var target = $(originalEvent.currentTarget.childNodes['0']);

                        alert('user-select');
                    }
                return;
        });

        table.on('click', 'tr.group', function () {
            alert('click row header');
         });
    }

    function initializeDOMEvents() {
        // edit
        $('#search').click(function (e) {
            // save the policy id
            currentPolicyNumber = $('#search-value').val();

            if (currentPolicyNumber != '') {
  
                // clear the form
                setPolicyProperties(null);
                $('#building-list').DataTable().clear().draw();
                setBuildingProperties(null);

                // run the search
                getPolicy(currentPolicyNumber);
            }
            else {
                showMessageBox("Information", "Enter a policy number");
            }

            // return
            e.preventDefault();
        });

        // bind save-map and cancel-map buttons
        $('#save-map').click(function (e) {
            if (isEditingRow()) {
                showMessageBox("", "Please save or undo your current edit before proceeding.");
                return false;
            }

            policyData.setControls(null);
            policyData.setDrawingMode(null);
            policyData.revertStyle();

            savePolicy();
            policyDataSnapshot = null;

            selectFeature(getSelectedFeature());
            showSaveCancel(false);

            e.preventDefault();

            //$('#search').click();
            //debugGeoJson();
        });
        $('#cancel-map').click(function (e) {
            policyData.setControls(null);
            policyData.setDrawingMode(null);
            policyData.revertStyle();

            cancelEdit();

            selectFeature(getSelectedFeature());
            showSaveCancel(false);

            e.preventDefault();

            //$('#search').click();
        });

        // configure the edit-form
        $('.edit-form-properties').click(function (e) {
            $(this).next('.edit-form-detail').slideToggle('slow');
            e.preventDefault();
        });
    } // end initializeDOMEvents
    function initializeAjax() {
        var $body = $("body");

        //$.ajaxSetup({
        //    cache: false
        //});

        $(document).on({
            ajaxStart: function () { $body.addClass("loading"); },
            ajaxStop: function () { $body.removeClass("loading"); }
        });
    }

    function initializeMap() {
        var mapOptions = {
            // control options to display
            zoomControl: true,
            mapTypeControl: true,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: true,

            // initial type of map to display
            mapTypeId: google.maps.MapTypeId.HYBRID,

            // set control options
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_TOP
            },

            mapTypeControlOptions: {
                mapTypeIds: [
                    google.maps.MapTypeId.HYBRID
                    , google.maps.MapTypeId.ROADMAP
                    , google.maps.MapTypeId.TERRAIN,
                    , google.maps.MapTypeId.SATELLITE
                ],
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                position: google.maps.ControlPosition.TOP_LEFT
            },

            fullscreenControlOptions: {
                position: google.maps.ControlPosition.RIGHT_TOP
            },

            // initial position and zoom of the map
            //center: new google.maps.LatLng(39.406123, -76.794814),
            //zoom: 17
            center: new google.maps.LatLng(39.385264, -100.678711),
            zoom: 5
        };

        map = new google.maps.Map(document.getElementById('map'), mapOptions);

        addLegend();
    } // end initializeMap
    function initializeMapEvents() {
        map.addListener('idle', function () {
            if (map.getZoom() >= 13) {
                if (policyData instanceof google.maps.Data) {
                    //var center = map.getCenter();
                    var bounds = map.getBounds();

                    var center = bounds.getCenter();
                    var southWest = bounds.getSouthWest();

                    // in meters
                    var radius = google.maps.geometry.spherical.computeDistanceBetween(center, southWest);

                    getProximity(center.lat(), center.lng(), radius, currentPolicyNumber);
                }
            }
            else {
                if (proximityData instanceof google.maps.Data) {
                    proximityData.setMap(null);
                    proximityData = null;
                }
            }
        });
    }

    function initializeSearchBox() {
        // Create the search box and link it to the UI element.
        var input = document.getElementById('pac-input');
        var searchBox = new google.maps.places.SearchBox(input);
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function () {
            searchBox.setBounds(map.getBounds());
        });

        var markers = [];
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // Clear out the old markers.
            markers.forEach(function (marker) {
                marker.setMap(null);
            });
            markers = [];

            // For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function (place) {
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
                var icon = {
                    url: place.icon,
                    size: new google.maps.Size(71, 71),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(17, 34),
                    scaledSize: new google.maps.Size(25, 25)
                };

                //// Create a marker for each place.
                //markers.push(new google.maps.Marker({
                //    map: map,
                //    icon: icon,
                //    title: place.name,
                //    position: place.geometry.location
                //}));

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
        });
    }

    function initializePolicyDataLayer(geoJson) {
        if (policyData instanceof google.maps.Data) {
            policyData.setMap(null);
            policyData = null;
        }

        var policyDataOptions = {
            controlPosition: google.maps.ControlPosition.LEFT_CENTER,
            style: getPolicyDataLayerStyle(true, false, false),

            // featureFactory is called when drawing is enabled and a user draws a Geometry.
            // Note: If the feature has an ID, it will replace any existing feature in the collection with the same ID
            featureFactory: function (g) {
                var selectedFeature = getSelectedFeature();
     
                var featureOptions = {
                    id: selectedFeature.getId(),
                    geometry: g,
                    properties: {
                        id: selectedFeature.getId(),
                        isDirty: "true"
                    }
                };

                // create the feature with the chosen options
                var newFeature = new google.maps.Data.Feature(featureOptions);

                // copy the feature properties
                copyFeatureProperties(selectedFeature, newFeature);

                // update feature TODO: Not sure this belongs here or that the order is correct.
                selectFeature(newFeature);
                setFeatureEditMode(newFeature, true);

                return newFeature;
            }
        };
        policyData = new google.maps.Data(policyDataOptions);

        initializePolicyDataEvents();

        policyData.addGeoJson(geoJson, { idPropertyName: 'id' })
        policyData.setMap(map);
    } // end initializePolicyDataLayer
    function initializePolicyDataEvents() {
        policyData.addListener('mouseover', function (event) {
            policyData.overrideStyle(event.feature, { strokeWeight: 6 });
        });
        policyData.addListener('mouseout', function (event) {
            policyData.overrideStyle(event.feature, { strokeWeight: 2 });
        });
        policyData.addListener('addfeature', function (event) {
            // set the bound property
            if (event.feature.getGeometry().getType() === 'Polygon') {
                var bounds = new google.maps.LatLngBounds();

                event.feature.getGeometry().getArray().forEach(function (path) {
                    path.getArray().forEach(function (latLng) { bounds.extend(latLng); })
                });
                event.feature.setProperty('bounds', bounds);

                //new google.maps.Rectangle({ map: map, bounds: bounds, clickable: false })
            }
        });
        policyData.addListener('click', function (event) {
            var originalRowId = getSelectedRowId();

            if (originalRowId != null) {
                if (validateRow(originalRowId) == false) {
                    event.stop();
                    return;
                }
            }

            var table = $('#building-list').DataTable();
            var id = event.feature.getId();
            table.rows('#' + id).select();

            var index = table.row('#' + id).index();

            table.page.jumpToData(id, 0);
            table.row(index).scrollTo(false);
        });

        policyData.addListener('dblclick', function (event) {
            zoomToFeature(getSelectedFeature());
            event.stop();
        });
    }

    function initializeProximityDataLayer(geoJson) {
        if (proximityData instanceof google.maps.Data) {
            proximityData.setMap(null);
            proximityData = null;
        }

        var proximityDataOptions = {
            style: getProximityDataLayerStyle(true, false, false)
        };
        proximityData = new google.maps.Data(proximityDataOptions);

        initializeProximityDataEvents();

        proximityData.addGeoJson(geoJson, { idPropertyName: 'id' })
        proximityData.setMap(map);
    }
    function initializeProximityDataEvents() {
        proximityData.addListener('mouseover', function (event) {
            proximityData.overrideStyle(event.feature, { strokeWeight: 6 });
        });
        proximityData.addListener('mouseout', function (event) {
            proximityData.overrideStyle(event.feature, { strokeWeight: 2 });
        });
        proximityData.addListener('dblclick', function (event) {
            alert('Double clicking a proximity object will cause the policy context to change.')
            event.stop();
        });
    }

    function initializeRiskGroupDataLayer() {
        if (riskGroupData instanceof google.maps.Data) {
            riskGroupData.setMap(null);
            riskGroupData = null;
        }

        var riskGroupDataOptions = {
            style: getRiskGroupDataLayerStyle(true, false, false)
        };

        riskGroupData = new google.maps.Data(riskGroupDataOptions);

        intializeRiskGroupDataEvents();

        //riskGroupData.addGeoJson(geoJson, {idPropertyName: 'id'})
        riskGroupData.setMap(map);
    }
    function intializeRiskGroupDataEvents() {
        riskGroupData.addListener('mouseover', function (event) {
            riskGroupData.overrideStyle(event.feature, { strokeWeight: 6 });
        });
        riskGroupData.addListener('mouseout', function (event) {
            riskGroupData.overrideStyle(event.feature, { strokeWeight: 2 });
        });
    }

    function initializeRiskGroupBuildingDataLayer() {
        if (riskGroupBuildingData instanceof google.maps.Data) {
            riskGroupBuildingData.setMap(null);
            riskGroupBuildingData = null;
        }

        var riskGroupBuildingDataOptions = {
            style: getRiskGroupBuildingDataLayerStyle(true, false, false)
        };

        riskGroupBuildingData = new google.maps.Data(riskGroupBuildingDataOptions);

        intializeRiskGroupBuildingDataEvents();

        //riskGroupData.addGeoJson(geoJson, {idPropertyName: 'id'})
        riskGroupBuildingData.setMap(map);
    }
    function intializeRiskGroupBuildingDataEvents() {
        riskGroupBuildingData.addListener('mouseover', function (event) {
            riskGroupBuildingData.overrideStyle(event.feature, { strokeWeight: 6 });
        });
        riskGroupBuildingData.addListener('mouseout', function (event) {
            riskGroupBuildingData.overrideStyle(event.feature, { strokeWeight: 2 });
        });
    }

    // helper functions
    function addSearchBox() {
        // Create the search box and link it to the UI element.
        var input = document.getElementById('pac-input');
        var searchBox = new google.maps.places.SearchBox(input);
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    }
    function addLegend() {
        var ctrl = null;

        ctrl = document.getElementById('legend');
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(ctrl);

        ctrl = document.getElementById('ctl-save-cancel');
        map.controls[google.maps.ControlPosition.TOP_CENTER].push(ctrl);
    }

    function snapshotDataLayer(sourceDataLayer, copyDataLayer) {
        sourceDataLayer.toGeoJson(function (o) {
            copyDataLayer = JSON.stringify(o);
        });
    }
    function beginEdit() {
        if (policyDataSnapshot == null) {
            snapshotDataLayer(policyData, policyDataSnapshot);
        }
    }
    function cancelEdit() {
        // hide the layer
        policyData.setMap(null);
        // remove the features and add them back
        policyData.forEach(function (feature) {
            policyData.remove(feature);
        });
        policyData.addGeoJson(JSON.parse(policyDataSnapshot));
        // show the layer
        policyData.setMap(map);
        // erase the snapshot
        policyDataSnapshot = null;

        $('.feature-edit-ok').val('Edit');
        $('.feature-edit-ok').switchClass('feature-edit-ok', 'feature-edit-edit');

        $('.feature-edit-undo').prop('disabled', true);
        $('.feature-edit-edit:disabled').prop('disabled', false);
    }
    function showSaveCancel(show) {
        if (show) {
            beginEdit();
            $('#ctl-save-cancel').show();
        } else {
            $('#ctl-save-cancel').hide();
        }
    }

    function validateRow(row) {
        if (row == null) {
            return true;
        }

        // test if the ok button is being shown
        if (isEditingRow()) {
            return false;
        }

        return true;
    }

    function selectFeature(feature) {
        // set styles
        policyData.revertStyle();
        policyData.overrideStyle(feature, { strokeColor: '#FF0000', icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' });

        // display properties
        setBuildingProperties(feature);

        // center the map on this feature if it is outside the viewport
        var viewPortBounds = map.getBounds();
        var geometry = feature.getGeometry();

        if (geometry.getType() === 'Polygon') {
            var polygonCoords = geometry.getArray();
            var points = polygonCoords[0].getArray();

            var bounds = new google.maps.LatLngBounds();
            // TODO: I should be able to optimize this if I have the polygon bounds already calculated.
            var i;
            for (i = 0; i < points.length; i++) {
                bounds.extend(points[i]);
            }

            if (!viewPortBounds.intersects(bounds)) {
                //map.panTo(bounds.getCenter());
                map.setCenter(bounds.getCenter());
            }
        }
        else if (geometry.getType() === 'Point') {
            if (!viewPortBounds.contains(geometry.get())) {
                //map.panTo(geometry.get());
                map.setCenter(geometry.get());
            }
        }
    }
    function copyFeatureProperties(fromFeature, toFeature) {
        toFeature.setProperty('groupRiskBuildingId', fromFeature.getProperty('groupRiskBuildingId'));
        toFeature.setProperty('buildingId', fromFeature.getProperty('buildingId'));
        toFeature.setProperty('constructionType', fromFeature.getProperty('constructionType'));
        toFeature.setProperty('pmlValue', fromFeature.getProperty('pmlValue'));
        toFeature.setProperty('groupRiskLocationId', fromFeature.getProperty('groupRiskLocationId'));
        toFeature.setProperty('protectionClass', fromFeature.getProperty('protectionClass'));
        toFeature.setProperty('grade', fromFeature.getProperty('grade'));
        toFeature.setProperty('area', fromFeature.getProperty('area'));
        toFeature.setProperty('stories', fromFeature.getProperty('stories'));
        toFeature.setProperty('address1', fromFeature.getProperty('address1'));
        toFeature.setProperty('address2', fromFeature.getProperty('address2'));
        toFeature.setProperty('address3', fromFeature.getProperty('address3'));
        toFeature.setProperty('city', fromFeature.getProperty('city'));
        toFeature.setProperty('state', fromFeature.getProperty('state'));
        toFeature.setProperty('postalCode', fromFeature.getProperty('postalCode'));
        toFeature.setProperty('isDirty', fromFeature.getProperty('isDirty'));
        toFeature.setProperty('bounds', fromFeature.getProperty('bounds'));
    }
    function setFeatureEditMode(feature, enableEdit) {
        if (enableEdit) {
            policyData.overrideStyle(feature, { clickable: true, draggable: true, editable: true });
            policyData.setControls(['Point', 'Polygon']);
            policyData.setDrawingMode('Polygon');
        }
        else {
            policyData.revertStyle();
            policyData.setStyle(getPolicyDataLayerStyle(true, false, false));
            //policyData.overrideStyle(feature, { clickable: true, draggable: false, editable: false });
            policyData.setControls(null);
            policyData.setDrawingMode(null);
        }
    }

    function setPolicyProperties(policy) {
        $('#policy-id').val((policy != null ? policy.policyId : ''));
        $('#policy-effective-date').val((policy != null ? policy.effectiveDate.split(' ')[0] : ''));
        $('#policy-expiration-date').val((policy != null ? policy.expirationDate.split(' ')[0] : ''));
    }
    function setBuildingProperties(feature) {
        // TODO: building id is mapping to the ID... so building id property is not necessary
        $('#building-id').val((feature != null ? feature.getId() : ''));
        $("#building-construction-type").val((feature != null ? feature.getProperty('constructionType') : ''));
        $("#building-pml-value").val((feature != null ? feature.getProperty('pmlValue') : ''));
        $("#building-protection-class").val((feature != null ? feature.getProperty('protectionClass') : ''));
        $("#building-grade").val((feature != null ? feature.getProperty('grade') : ''));
        $("#building-area").val((feature != null ? feature.getProperty('area') : ''));
        $("#building-stories").val((feature != null ? feature.getProperty('stories') : ''));
        $('#building-address-1').val((feature != null ? feature.getProperty('address1') : ''));
        $('#building-address-2').val((feature != null ? feature.getProperty('address2') : ''));
        $('#building-address-3').val((feature != null ? feature.getProperty('address3') : ''));
        $('#building-city').val((feature != null ? feature.getProperty('city') : ''));
        $('#building-state').val((feature != null ? feature.getProperty('state') : ''));
        $('#building-postal').val((feature != null ? feature.getProperty('postal') : ''));
    }

    function zoomToFeature(feature) {
        var bounds = new google.maps.LatLngBounds();

        processPoints(feature.getGeometry(), bounds.extend, bounds);

        // set the view appropriately
        map.setCenter(bounds.getCenter());
        map.fitBounds(bounds);
    }
    function fitDataLayerBounds(dataLayer) {
        var bounds = new google.maps.LatLngBounds();

        dataLayer.forEach(function (feature) {
            processPoints(feature.getGeometry(), bounds.extend, bounds);
        });

        map.setCenter(bounds.getCenter());
        map.fitBounds(bounds);
    }
    function processPoints(geometry, callback, thisArg) {
        if (geometry instanceof google.maps.LatLng) {
            callback.call(thisArg, geometry);
        } else if (geometry instanceof google.maps.Data.Point) {
            callback.call(thisArg, geometry.get());
        } else {
            geometry.getArray().forEach(function (g) {
                processPoints(g, callback, thisArg);
            });
        }
    }

    function getPolicy(policyNumber) {
        $.ajax({
            url: getVirtualDirectory() + 'api/policyDataLayer/' + policyNumber,
            cache: false,
            //async: false,
            type: 'GET',
            dataType: 'json',
            success: function (policy, textStatus, xhr) {
                setPolicyProperties(policy);
                var geoJsonParse = JSON.parse(policy.buildingGeoJson);
                initializePolicyDataLayer(geoJsonParse);
                addPolicyRows();
                fitDataLayerBounds(policyData);
            },
            error: function (xhr, textStatus, errorThrown) {
                showMessageBox("Error", errorThrown);
            }
        });
    }
    function addPolicyRows() {
        var table = $('#building-list').DataTable();
        policyData.forEach(function (feature) {
            var addr = "";

            if (feature.getProperty('address1')){
                addr = feature.getProperty('address1');
            }

            if (feature.getProperty('address2')) {
                addr = addr.trim() + ' ' + feature.getProperty('address2');
            }

            if (feature.getProperty('address3')) {
                addr = addr.trim() + ' ' + feature.getProperty('address3');
            }

            if (feature.getProperty('city')) {
                addr = addr.trim() + ' ' + feature.getProperty('city');
            }

            if (feature.getProperty('state')) {
                addr = addr.trim() + ' ' + feature.getProperty('state');
            }

            if (feature.getProperty('postal')) {
                addr = addr.trim() + ' ' + feature.getProperty('postal');
            }

            table.row.add({ id: feature.getId(), address: addr }).draw(true);
        });
    }
    function savePolicy() {
        policyData.toGeoJson(function (o) {
            // TODO: change this sample data
            var policy = {
                groupdRiskPolicyId: '123',
                policyId: '123',
                effectiveDate: '12/01/1900',
                expirationDate: '12/31/1900',
                name: 'test name',
                sourceSystem: 'test system',
                buildingGeoJson: JSON.stringify(o)
            }

            $.ajax({
                url: getVirtualDirectory() + 'api/policyDataLayer', // A valid URL
                type: 'PUT', // Use POST with X-HTTP-Method-Override or a straight PUT if appropriate.
                dataType: 'json', // Set datatype - affects Accept header
                data: policy, // Some data e.g. Valid JSON as a string
                error: function (xhr, textStatus, errorThrown) {
                    showMessageBox("Error", errorThrown);
                }
            });
        });
    }

    function getProximity(lat, lng, radius, excludePolicyNumber) {
        $.ajax({
            url: getVirtualDirectory() + 'api/proximityDataLayer/', // + lat + '/' + lng,
            cache: false,
            type: 'GET',
            data: { centerLatitude: lat, centerLongitude: lng, radius: radius, excludePolicyNumber: excludePolicyNumber
            },
            dataType: 'json',
            global: false,
            success: function (result, textStatus, xhr) {
                var geoJsonParse = JSON.parse(result.buildingGeoJson);
                initializeProximityDataLayer(geoJsonParse);
            },
            error: function (xhr, textStatus, errorThrown) {
                showMessageBox("Error", errorThrown);
            }
        });
    }

    function getRiskGroup(policyNumber) {
        $.ajax({
            url: getVirtualDirectory() + 'api/riskGroupDataLayer/' + policyNumber,
            cache: false,
            type: 'GET',
            dataType: 'json',
            global: true,
            success: function (result, textStatus, xhr) {
                initializeRiskGroupDataLayer();
                initializeRiskGroupBuildingDataLayer();
                for (var i = 0, len = result.length; i < len; i++) {
                    riskGroupDataInitial.addGeoJson(JSON.parse(result[i].riskGroupGeoJson), { idPropertyName: 'id' })
                    riskGroupBuildingDataInitial.addGeoJson(JSON.parse(result[i].buildingGeoJson), { idPropertyName: 'id' });
                }
                addRiskGroupRows();
            },
            error: function (xhr, textStatus, errorThrown) {
                showMessageBox("Error", errorThrown);
            }
        });
    }
    function addRiskGroupRows() {
        var table = $('#group-list').DataTable();
        riskGroupDataInitial.forEach(function (feature) {
            table.row.add({ id: feature.getId(), pmlValue: '1M' }).draw(true);
        });
    }
    function addRiskGroupBuildingRows(groupId) {
        var table = $('#group-building-list').DataTable();
        table.clear().draw();
        if (groupId != null) {
            riskGroupBuildingDataInitial.forEach(function (feature) {
                if (feature.getProperty('groupId') === groupId) {
                    table.row.add({ id: feature.getId(), policyId: feature.getProperty('policyId'), address: feature.getId(), pmlValue: feature.getProperty('pmlValue') }).draw(true);
                }
            });
        }
    }

    function isEditingRow() {
        if ($('.feature-edit-ok').length) {
            return true;
        }
        else {
            return false;
        }
    }

    function showMessageBox(title, message) {
        $(".message-box > p").html(message);
        $(".message-box").dialog();
    }

    function getPolicyDataLayerStyle(isClickable, isDraggable, isEditable) {
        return {
            clickable: isClickable,
            draggable: isDraggable,
            editable: isEditable,
            fillColor: '#ffff00',
            fillOpacity: .5,
            strokeColor: '#ffff00',
            icon: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
        }
    }
    function getProximityDataLayerStyle(isClickable, isDraggable, isEditable) {
        return {
            clickable: isClickable,
            draggable: isDraggable,
            editable: isEditable,
            fillColor: '#79CCE8',
            fillOpacity: .5,
            strokeColor: '#79CCE8',
            icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        }
    }
    function getRiskGroupDataLayerStyle(isClickable, isDraggable, isEditable) {
        return {
            clickable: isClickable,
            draggable: isDraggable,
            editable: isEditable,
            fillColor: '#DD5E0E',
            fillOpacity: .5,
            strokeColor: '#DD5E0E',
            icon: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
        }
    }
    function getRiskGroupBuildingDataLayerStyle(isClickable, isDraggable, isEditable) {
        return {
            clickable: isClickable,
            draggable: isDraggable,
            editable: isEditable,
            fillColor: '#DD5E0E',
            fillOpacity: .5,
            strokeColor: '#DD5E0E',
            icon: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
        }
    }

    function getSelectedRowId() {
        var rowId = null;
        var table = $('#building-list').DataTable();
        var data = table.rows({ selected: true }).data();
        if (data[0] != null) {
            rowId = data[0].id;
        }
        return rowId;
    }
    function getSelectedFeature() {
        var feature = null;
        var currentRowId = getSelectedRowId();
        feature = policyData.getFeatureById(currentRowId);
        return feature;
    }

    function getSelectedGroupRowId() {
        var rowId = null;
        var table = $('#group-list').DataTable();
        var data = table.rows({ selected: true }).data();
        if (data[0] != null) {
            rowId = data[0].id;
        }
        return rowId;
    }
    function getSelectedGroupFeature() {
        var feature = null;
        var currentRowId = getSelectedGroupRowId();
        feature = riskGroupData.getFeatureById(currentRowId);
        return feature;
    }

    function getDomainName() {
        var url = window.location.href;
        var url_parts = url.split('/');
        var domain_name_parts = url_parts[2].split(':');
        var domain_name = domain_name_parts[0];
        return domain_name;
    }
    function getPortNumber() {
        var url = window.location.href;
        var url_parts = url.split('/');
        var domain_name_parts = url_parts[2].split(':');
        var port_number = domain_name_parts[1];
        return port_number;
    }
    function getVirtualDirectory() {
        var url = window.location.href;
        var url_parts = url.split('/');
        url_parts[url_parts.length - 1] = '';
        var current_page_virtual_path = url_parts.join('/');
        //alert('vd = ' + current_page_virtual_path);
        return current_page_virtual_path;
    }
    function getNewPath(relative_path) {
        var url = window.location.href;
        var url_parts = url.split('/');
        url_parts[url_parts.length - 1] = relative_path;
        var new_page_absolute_path = url_parts.join('/');
        return new_page_absolute_path;
    }

    function debugFeatureGeoJson(feature) {
        // export the policyData
        feature.toGeoJson(function (o) { console.log(o) });
        feature.toGeoJson(function (o) { console.log(JSON.stringify(o)) });
    }
    function debugGeoJson() {
        // export the policyData
        policyData.toGeoJson(function (o) { console.log(o) });
        policyData.toGeoJson(function (o) { console.log(JSON.stringify(o)) });
    }
});
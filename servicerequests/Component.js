sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/json/JSONModel",
	"ServiceRequests/model/models",
	"ServiceRequests/controller/ListSelector",
	"ServiceRequests/controller/ErrorHandler"
], function(UIComponent, Device, ODataModel, JSONModel, models, ListSelector, ErrorHandler) {
	"use strict";

	return UIComponent.extend("ServiceRequests.Component", {

		metadata: {
			manifest: "json"
		},

		contactUUID: null,
		contactID: null,
		mockData: false,
		SELECT_BOX_URLS: {
			ServiceRequestLifeCycleStatusCode: '/ServiceRequestServiceRequestLifeCycleStatusCodeCollection',
			ServicePriorityCode: '/ServiceRequestServicePriorityCodeCollection',
			ServiceCategory: '/ServiceIssueCategoryCatalogueCategoryCollection',
			IncidentCategory: '/ServiceIssueCategoryCatalogueCategoryCollection?$filter=ParentObjectID%20eq%20%27${0}%27',
			DescriptionTypeCollection: '/ServiceRequestTextCollectionTypeCodeCollection',
			ProductCategoryCollection: '/ProductCollection'
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function() {
			if (window.location.href.indexOf("mockData") !== -1 || sap.ushell.Container.getUser().getEmail() === "") {
				this.mockData = true;
				var model = new JSONModel(jQuery.sap.getModulePath("ServiceRequests") + "/mock/c4codata.json");
				model.attachRequestCompleted(function() {
					this.getData().ServiceRequestCollection.forEach(function(request) {
						request.ServiceRequestDescription.forEach(function(description) {
							description.CreatedOn = new Date(parseInt(description.CreatedOn.substring(description.CreatedOn.indexOf("(") + 1, description.CreatedOn.indexOf(")"))));
						});
					});
				});
				this.setModel(model);
			} else {
				this.setModel(new ODataModel(jQuery.sap.getModulePath("ServiceRequests") +
					"/destinations/c4c/sap/byd/odata/v1/c4codata/", {
					useBatch: false
				}));
				this._oErrorHandler = new ErrorHandler(this);
			}

			this.oListSelector = new ListSelector();
			this.startupParams = this.receiveStartupParams();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// call the base component's init function and create the App view
			UIComponent.prototype.init.apply(this, arguments);

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		receiveStartupParams: function() {
			var obj = {},
				oComponentData = this.getComponentData && this.getComponentData();

			if (oComponentData && oComponentData.startupParameters) {
				var startupParameters = oComponentData.startupParameters;
				obj.createNewTicket = startupParameters.createNewTicket && startupParameters.createNewTicket[0];
				obj.highPriority = startupParameters.highPriority && startupParameters.highPriority[0];
				obj.pendingResponse = startupParameters.pendingResponse && startupParameters.pendingResponse[0];
			}

			return obj;
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ListSelector and ErrorHandler are destroyed.
		 * @public
		 * @override
		 */
		destroy: function() {
			this.oListSelector.destroy();
			if (!this.mockData) {
				this._oErrorHandler.destroy();
			}
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},

		onConfigChange: function(oEvent) {
			var settings = this.getMetadata().getManifest()["sap.cloud.portal"].settings;
			this.getAggregation("rootControl").$().css("height", settings.widgetHeight.value + "px");
		}
	});

});
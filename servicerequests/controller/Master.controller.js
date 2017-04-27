sap.ui.define([
	"ServiceRequests/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/Device",
	"sap/ui/core/util/Export",
	"sap/ui/core/util/ExportTypeCSV",
	"sap/m/GroupHeaderListItem",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"ServiceRequests/model/formatter"
], function(BaseController, JSONModel, Filter, FilterOperator, Device, Export, ExportTypeCSV, GroupHeaderListItem, MessageBox, MessageToast, formatter) {
	"use strict";
	/*global $*/

	return BaseController.extend("ServiceRequests.controller.Master", {

		formatter: formatter,
		oDialog: null,
		fileToUpload: null,
		initialCreateTicketOpened: false,
		contactUUID: null,
		contactID: null,
		component: null,
		mockData: false,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function() {
			this.component = this.getOwnerComponent();
			this.alreadyRendered = false;
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.subscribe("Detail", "DetailHasRendered", function() {
			});
			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};
			this.setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});
			this.getView().addEventDelegate({
				onBeforeFirstShow: function() {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);

			if (this.getOwnerComponent().mockData) {
				this.mockData = true;
				var view = this.getView();
				view.byId("addButton").setEnabled(true);
				view.byId("downloadButton").setEnabled(true);
			}
		},
		onBeforeRendering: function() {
			this.getC4CContact();
			this.setListFilters();
		},

		getC4CContact: function() {
			var userEmail = sap.ushell.Container.getUser().getEmail(),
				model = this.getView().getModel(),
				url = model.sServiceUrl + "/ContactCommunicationDataCollection?$format=json&$expand=AccountContactRelationship&$filter=EMail eq %27" + userEmail + "%27";

			$.ajax({
				method: "GET",
				url: url,
				success: function(data) {
					var results = data.d.results;
					if (results.length > 0) {
						this.component.contactUUID = results[0].AccountContactRelationship.ContactUUID;
						var href = "ContactCollection?$format=json&$filter=ObjectID eq %27" + this.component.contactUUID.split("-").join("") + "%27";
						url = model.sServiceUrl + "/" + href;
						$.ajax({
							method: "GET",
							url: url,
							success: function(result) {
								this.contactID = result.d.results[0].ContactID;
								var view = this.getView();
								view.byId("addButton").setEnabled(true);
								view.byId("downloadButton").setEnabled(true);
							}.bind(this),
							error: function(jqXHR) {
								var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
								var error = elm.innerHTML || elm.textContent;
								MessageBox.error(error);
							}
						});
					} else {
						MessageToast.show("You cannot view or create tickets because your email " + userEmail + " is not assigned to a contact in the C4C tenant");
					}
				}.bind(this),
				error: function(jqXHR) {
					var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
					var error = elm.innerHTML || elm.textContent;
					MessageBox.error(error);
				}
			});
		},
		onServiceCategorySelectCreateFragment: function() {
			this.getIncidentCategoryList();
		},
		getIncidentCategoryList: function() {
			var createServiceSelect = sap.ui.getCore().byId("createServiceCategory"),
				parentObject = createServiceSelect.getSelectedItem().data("parentObject"),
				cmpt = this.getOwnerComponent(),
				oModel = cmpt.getModel(),
				_self = this,
				URLS = cmpt.SELECT_BOX_URLS;
			sap.ui.getCore().byId("createIncidentCategory").setBusy(true);
			if (cmpt.mockData) {
				var mockModelData = this.oDialog.getModel("ServiceRequest").getData();
				var incidentModel = mockModelData.IncidentModel;
				this.initIncidentModel(incidentModel[parentObject]);
			} else {
				oModel.read(URLS.IncidentCategory.replace('${0}', parentObject), {
					success: _self.initIncidentModel.bind(_self),
					error: function(jqXHR) {
						var error = jqXHR.responseJSON.error.message.value;
						MessageBox.error(error);
						sap.ui.getCore().byId("createIncidentCategory").setBusy(false);
					}
				});
			}

		},
		initIncidentModel: function(data) {
			var incidentModel = this.oDialog.getModel("IncidentModel");
			incidentModel.setData(data);
			incidentModel.refresh();
			sap.ui.getCore().byId("createIncidentCategory").setBusy(false);
		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter and hides the pull to refresh control, if
		 * necessary.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
			// hide pull to refresh if necessary
			this.byId("pullToRefresh").hide();
			var items = this._oList.getItems();
			if (items.length === 0) {
				this.getRouter().getTargets().display("detailNoObjectsAvailable");
			}
			else if (!this._oList.getSelectedItem() && items.length > 0) {
				this._oList.setSelectedItem(items[0]);
				this._showDetail(items[0]);
			}
		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("Name/content", FilterOperator.Contains, sQuery)];
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function(oEvent) {
			// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
			this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed: function() {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader: function(oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text,
				upperCase: false
			});
		},
		onAfterRendering: function() {
			var startupParams = this.component.startupParams;
			if (window.location.hash.substring(1).indexOf("createNewTicket=true") > -1 || startupParams.createNewTicket === "true") {
				if (!this.initialCreateTicketOpened) {
					this.initialCreateTicketOpened = true;
					var newSiteProperties = window.location.hash.substring(1).split('?')[1];
					this.onAdd(this.splitData(newSiteProperties));
				}
			}
		},
		splitData: function(urlData) {
			var result = {};
			if (urlData) {
				var query = urlData;
				query.split("&").forEach(function(part) {
					var item = part.split("=");
					result[item[0]] = decodeURIComponent(item[1]);
				});
			}
			return result;
		},
		onAdd: function(context) {
			if (!this.oDialog) {
				var _self = this;
				this.oDialog = sap.ui.xmlfragment("ServiceRequests.fragment.Create", this);
				var dialogModel = new JSONModel();
				dialogModel.setProperty("createEnabled", false);
				dialogModel.setProperty("titleInput", '');
				dialogModel.setProperty("descriptionInput", '');
				var incidentModel = new JSONModel({results: []});
				this.oDialog.setModel(incidentModel, "IncidentModel");
				var isMock = this.getOwnerComponent().mockData;
				if (isMock) {
					var mockModel = new JSONModel(jQuery.sap.getModulePath("ServiceRequests") + "/mock/serviceMockData.json");
					mockModel.attachRequestCompleted(function() {
						_self.oDialog.setModel(new JSONModel(this.getData().ServiceRequest), "ServiceRequest");
						_self.oDialog.open();
					});
				} else {
					this.oDialog.setModel(this.getOwnerComponent().getModel(), "ServiceRequest");
				}
				this.oDialog.setModel(dialogModel);
				this.oDialog.attachAfterClose(function() {
					this.oDialog.destroy();
					this.oDialog = null;
				}.bind(this));
				this.getView().addDependent(this.oDialog);
				this.oDialog.attachAfterOpen(function() {
					this.onDialogOpen(context);
				}.bind(this));
				if (!isMock) {
					this.oDialog.open();
				}
			}

		},
		onDialogOpen: function(context) {
			var serviceCategorySelect = sap.ui.getCore().byId("createServiceCategory"),
				incidentCategorySelect = sap.ui.getCore().byId("createIncidentCategory");
			incidentCategorySelect.setBusy(true);
			for (var select in context) {
				if (select.toLocaleLowerCase() !== "createnewticket") {
					var selectBox = sap.ui.getCore().byId('create' + select);
					if (selectBox) {
						selectBox.setSelectedKey(context[select]);
					}
				}

			}
			if (this.getOwnerComponent().mockData) {
				this.serviceCategoryLoaded();
			} else {
				serviceCategorySelect.getBinding("items").attachEvent('dataReceived', this.serviceCategoryLoaded.bind(this));
			}

		},

		serviceCategoryLoaded: function(oEvent) {
			var serviceRequestModel = this.oDialog.getModel("ServiceRequest");
			if (this.getOwnerComponent().mockData) {

				var mockModelData = this.oDialog.getModel("ServiceRequest").getData(),
					parentObject = mockModelData.ServiceIssueCategoryCatalogueCategoryCollection[0].ParentObjectID,
					incidentModel = mockModelData.IncidentModel;
				this.onIncidentLoaded(incidentModel[parentObject]);
			} else {
				var selectedData = oEvent.getParameter("data").results[0],
					URLS = this.getOwnerComponent().SELECT_BOX_URLS;
				serviceRequestModel.read(URLS.IncidentCategory.replace('${0}', selectedData.ParentObjectID), {
					success: this.onIncidentLoaded.bind(this),
					error: this.onIncidentFailed.bind(this)
				});
			}

		},

		onIncidentLoaded: function(oData) {
			var incidentModel = this.oDialog.getModel("IncidentModel");
			incidentModel.setData(oData);
			incidentModel.refresh();
			sap.ui.getCore().byId("createIncidentCategory").setBusy(false);
		},

		onIncidentFailed: function(jqXHR) {
			var error = jqXHR.responseJSON.error.message.value;
			MessageBox.error(error);
			this.getView().byId("createIncidentCategory").setBusy(false);

		},
		onDialogAdd: function() {
			this.createTicket();
		},
		onFileChange: function(oEvent) {
			this.fileToUpload = oEvent.getParameter("files")["0"];
		},
		createTicket: function() {
			var view = this.getView(),
				core = sap.ui.getCore(),
				titleInput = core.byId("createTitle"),
				descriptionInput = core.byId("createDescription");

			titleInput.setValueState(titleInput.getValue() ? "None" : "Error");
			descriptionInput.setValueState(descriptionInput.getValue() ? "None" : "Error");
			if (!titleInput.getValue() || !descriptionInput.getValue()) {
				return;
			}
			var mockData = {
				"RequestAssignmentStatusCode": "2",
				"CompletedOnDate": "\/Date(1465344000000)\/",
				"ObjectID": this.createMockGUID(),
				"ActivityServiceIssueCategoryID": "",
				"ApprovalStatusCode": "1",
				"CauseServiceIssueCategoryID": "",
				"ChangedBy": "Test Agent",
				"CompletionDueDate": "\/Date(1465603200000)\/",
				"ContractID": "",
				"CreatedBy": "Juliane Beyer",
				"CreationDate": new Date(),
				"Customer": "",
				"CustomerID": "",
				"DataOriginTypeCode": "1",
				"ID": "6006",
				"IncidentCategoryName": {
					"__metadata": {
						"type": "c4codata.MEDIUM_Name"
					},
					"content": ""
				},
				"ActivityCategoryName": {
					"__metadata": {
						"type": "c4codata.MEDIUM_Name"
					},
					"content": ""
				},
				"CauseCategoryName": {
					"__metadata": {
						"type": "c4codata.MEDIUM_Name"
					},
					"content": ""
				},
				"IncidentServiceIssueCategoryID": core.byId("createIncidentCategory").getSelectedKey(),
				"InitialReviewDueDate": "\/Date(1465344000000)\/",
				"InstallationPointID": "",
				"InstalledBaseID": "",
				"ItemListServiceRequestExecutionLifeCycleStatusCode": "1",
				"LastChangeDate": "\/Date(1466035200000)\/",
				"LastResponseOnDate": "\/Date(1465344000000)\/",
				"Name": {
					"__metadata": {
						"type": "c4codata.EXTENDED_Name"
					},
					"languageCode": "E",
					"content": titleInput.getValue()
				},
				"NextResponseDueDate": null,
				"ObjectCategoryName": {
					"__metadata": {
						"type": "c4codata.MEDIUM_Name"
					},
					"content": ""
				},
				"ObjectServiceIssueCategoryID": "",
				"Partner": "",
				"PartnerID": "",
				"ProcessingTypeCode": "SRRQ",
				"ProductID": core.byId("createProductCategory").getSelectedKey(),
				"ReferenceDate": null,
				"ReportedForEmail": "",
				"ReportedForPartyID": "",
				"ReporterEmail": "guy.roth@SAP.COM",
				"ReporterPartyID": "1001702",
				"RequestedEnd": "2016-06-11T07:00:00Z",
				"RequestedEndTimeZoneCode": "PST",
				"RequestedStart": "2016-06-10T07:00:00Z",
				"RequestedStartTimeZoneCode": "PST",
				"RoleCode": "8",
				"SalesTerritoryID": "",
				"SerialID": "",
				"ServiceCategoryName": {
					"__metadata": {
						"type": "c4codata.MEDIUM_Name"
					},
					"content": "Account Support"
				},
				"ServiceIssueCategoryID": core.byId("createServiceCategory").getSelectedKey(),
				"ServiceLevelAgreement": "CLOUDFORSERVICE_STANDARD",
				"ServicePriorityCode": core.byId("createPriority").getSelectedKey(),
				"ServiceRequestClassificationCode": "",
				"ServiceRequestLifeCycleStatusCode": "1",
				"ServiceTechnician": "",
				"ServiceTechnicianTeam": "",
				"WarrantyDescription": "",
				"WarrantyFrom": null,
				"WarrantyTo": null,
				"ServiceAndSupportTeam": "S3110",
				"ServiceRequestUserLifeCycleStatusCode": "4",
				"AssignedTo": "",
				"EscalationStatus": "1",
				"AssignedToName": {
					"__metadata": {
						"type": "c4codata.ENCRYPTED_LONG_Name"
					},
					"languageCode": "",
					"content": ""
				},
				"ProductCategoryDescription": "Sweets",
				"InitialResponseDate": "\/Date(1465344000000)\/",
				"Contact": "",
				"ParentServiceRequest": "",
				"ETag": "\/Date(1466098359312)\/",
				"CreationDateTime": new Date(),
				"LastChangeDateTime": "\/Date(1466098359312)\/",
				"RequestAssignmentStatusCodeText": "Requestor Action",
				"ApprovalStatusCodeText": "Not Started",
				"DataOriginTypeCodeText": "Manual data entry",
				"ItemListServiceRequestExecutionLifeCycleStatusCodeText": "Open",
				"ProcessingTypeCodeText": "Service Request",
				"RoleCodeText": "Service Point",
				"ServicePriorityCodeText": core.byId("createPriority").getSelectedItem().getText(),
				"ServiceRequestClassificationCodeText": "",
				"ServiceRequestLifeCycleStatusCodeText": "In Process",
				"ServiceRequestUserLifeCycleStatusCodeText": "Open",
				"EscalationStatusText": "Not Escalated",
				"ServiceRequestItem": {
					"__deferred": {
						"uri": "/servicerequests/destinations/c4c/sap/byd/odata/v1/c4codata/ServiceRequestCollection('00163E08A7AF1EE68BB3A36C8C740442')/ServiceRequestItem"
					}
				},
				"ServiceRequestAttachmentFolder": [],
				"ServiceRequestDescription": []
			};
			var data = {
				ReporterPartyID: this.contactID,
				Name: {
					content: titleInput.getValue()
				},
				ServiceRequestLifeCycleStatusCode: "1",
				ServicePriorityCode: core.byId("createPriority").getSelectedKey(),
				ProductID: core.byId("createProductCategory").getSelectedKey(),
				ServiceIssueCategoryID: core.byId("createServiceCategory").getSelectedKey(),
				IncidentServiceIssueCategoryID: core.byId("createIncidentCategory").getSelectedKey()
			};

			this.oDialog.setBusy(true);
			if (!this.mockData) {
				var model = view.getModel(),
					url = model.sServiceUrl + "/ServiceRequestCollection",
					token = model.getSecurityToken();
				jQuery.ajax({
					url: url,
					method: "POST",
					contentType: "application/json",
					headers: {
						"X-CSRF-TOKEN": token
					},
					data: JSON.stringify(data),
					success: this.setTicketDescription.bind(this),
					error: function(jqXHR) {
						var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
						var error = elm.innerHTML || elm.textContent;
						MessageBox.error(error);
						this.oDialog.setBusy(false);
					}.bind(this)
				});
			} else {
				this.setTicketDescription(mockData);
			}
		},

		createMockGUID: function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000)
					.toString(16)
					.substring(1)
					.toUpperCase();
			}

			return s4() + s4() + s4() + s4() +
				s4() + s4() + s4() + s4();
		},

		setTicketDescription: function(result) {
			if (!this.mockData) {
				var model = this.getModel(),
					authorUUID = this.component.contactUUID,
					elm = result.getElementsByTagName("id")[0],
					baseUrl = elm.innerHTML || elm.textContent,
					url = baseUrl + "/ServiceRequestDescription",
					text = sap.ui.getCore().byId("createDescription").getValue(),
					token = model.getSecurityToken();
				jQuery.ajax({
					url: url,
					method: "POST",
					contentType: "application/json",
					headers: {
						"X-CSRF-TOKEN": token
					},
					data: JSON.stringify({
						TypeCode: "10004",
						AuthorUUID: authorUUID,
						Text: text
					}),
					success: function() {
						this.uploadAttachment(result);
					}.bind(this),
					error: function(jqXHR) {
						var error = jqXHR.responseJSON.error.message.value;
						MessageBox.error("The service request was created successfully, but a description could not be set: " + error);
						this.oDialog.setBusy(false);
					}
				});
			} else {
				var serviceData = result.ServiceRequestDescription;
				var user = sap.ushell.Container.getUser();
				var dataDescription = {
					TypeCode: "10004",
					AuthorName: user.getFullName(),
					Text: sap.ui.getCore().byId("createDescription").getValue(),
					CreatedOn: new Date()
				};
				serviceData.push(dataDescription);
				this.uploadAttachment(result);
			}
		},
		uploadAttachment: function(result) {
			if (this.fileToUpload) {
				var fileReader = new FileReader();
				fileReader.onload = function(e) {
					this.uploadFile(e, result);
				}.bind(this);
				fileReader.readAsBinaryString(this.fileToUpload);
			} else {
				this.finishCreateTicket(result);
			}
		},
		uploadFile: function(e, result) {
			var model = this.getModel();
			if (!this.mockData) {
				var elmMock = result.getElementsByTagName("id")[0],
					baseUrl = elmMock.innerHTML || elmMock.textContent,
					url = baseUrl + "/ServiceRequestAttachmentFolder",
					token = model.getSecurityToken();
				var dataMock = {
					Name: this.fileToUpload.name,
					Binary: window.btoa(e.target.result)
				};
				jQuery.ajax({
					url: url,
					method: "POST",
					contentType: "application/json",
					headers: {
						"X-CSRF-TOKEN": token
					},
					data: JSON.stringify(dataMock),
					success: this.finishCreateTicket.bind(this),
					error: function(jqXHR) {
						var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
						var error = elm.innerHTML || elm.textContent;
						MessageBox.error("The service request was created successfully, but the attachment could not be uploaded: " + error);
						this.oDialog.setBusy(false);
					}
				});
			} else {
				var data = {
					Name: this.fileToUpload.name,
					fileBlob: new Blob([this.fileToUpload], {type: "any"})
				};

				var attachmentData = result.ServiceRequestAttachmentFolder;
				attachmentData.push(data);
				this.finishCreateTicket(result);
			}
			this.fileToUpload = null;
		},
		finishCreateTicket: function(data) {
			var model = this.getModel(),
				modelData = model.getData();
			if (data && this.mockData) {
				var arrayToInsert = [data],
					oldData = modelData.ServiceRequestCollection,
					newArr = arrayToInsert.concat(oldData);
				model.setData({ServiceRequestCollection: newArr});
			}
			MessageToast.show("The service request was created successfully");
			this.oDialog.setBusy(false);
			this._oList.removeSelections();
			model.refresh();
			this.oDialog.close();
			if (this.mockData) {
				this.updateMockItemDetails();
			}
		},
		updateMockItemDetails: function() {
			var items = this._oList.getItems();
			this._showDetail(items[0]);
		},
		onDialogCancel: function() {
			this.oDialog.close();
		},
		onTitleChange: function(oEvent) {
			var titleInput = oEvent.getSource();
			if (this.isStringEmpty(titleInput.getValue())) {
				titleInput.setValueState(sap.ui.core.ValueState.Error);
				titleInput.setValueStateText("Please enter a value");
			} else {
				titleInput.setValueState(sap.ui.core.ValueState.None);
				var createBtn = sap.ui.getCore().byId("addDialogCreateButton");
				if (this.isCreateTicketEnabled(titleInput.getValue(), sap.ui.getCore().byId("createDescription").getValue())) {
					createBtn.setEnabled(true);
				} else {
					createBtn.setEnabled(false);
				}
			}
		},
		onTextAreaChange: function(oEvent) {
			var textareaInput = oEvent.getSource();
			if (this.isStringEmpty(textareaInput.getValue())) {
				textareaInput.setValueState(sap.ui.core.ValueState.Error);
				textareaInput.setValueStateText("Please enter a value");
			} else {
				textareaInput.setValueState(sap.ui.core.ValueState.None);
				var createBtn = sap.ui.getCore().byId("addDialogCreateButton");
				if (this.isCreateTicketEnabled(sap.ui.getCore().byId("createTitle").getValue(), textareaInput.getValue())) {
					createBtn.setEnabled(true);
				} else {
					createBtn.setEnabled(false);
				}
			}
		},
		isCreateTicketEnabled: function(titleInput, descriptionInput) {
			if (titleInput && descriptionInput) {
				return (titleInput.trim().length !== 0 && descriptionInput.trim().length !== 0);
			}
			return false;

		},
		isStringEmpty: function(text) {
			return text.trim().length === 0;
		},
		setListFilters: function() {
			var startupParams = this.component.startupParams;

			if (!this.mockData) {
				var userEmail = sap.ushell.Container.getUser().getEmail();
				this._oListFilterState.aFilter.push(new Filter("ReporterEmail", FilterOperator.EQ, userEmail));
			}

			if (startupParams.pendingResponse) {
				this._oListFilterState.aFilter.push(new Filter("ServiceRequestUserLifeCycleStatusCode", FilterOperator.EQ, "4"));
			} else {
				this._oListFilterState.aFilter.push(new Filter("ServiceRequestUserLifeCycleStatusCodeText", FilterOperator.NE, "Completed"));
				if (startupParams.highPriority) {
					this._oListFilterState.aFilter.push(new Filter("ServicePriorityCode", FilterOperator.LT, "3"));
				}
			}

			this._oList.getBinding("items").filter(this._oListFilterState.aFilter, "Application");
		},

		onDownload: function() {
			var download = new Export({
				exportType: new ExportTypeCSV({
					separatorChar: ","
				}),

				models: this.getView().getModel(),

				rows: {
					path: "/ServiceRequestCollection",
					filters: this._oListFilterState.aFilter
				},

				columns: [{
					name: "Title",
					template: {
						content: "{Name/content}"
					}
				}, {
					name: "Priority",
					template: {
						content: "{ServicePriorityCodeText}"
					}
				}, {
					name: "Status",
					template: {
						content: "{ServiceRequestUserLifeCycleStatusCodeText}"
					}
				}, {
					name: "Product Category",
					template: {
						content: "{ProductCategoryDescription}"
					}
				}, {
					name: "Service Issue Category",
					template: {
						content: "{ServiceCategoryName/content}"
					}
				}, {
					name: "Incident Category ID",
					template: {
						content: "{IncidentServiceIssueCategoryID}"
					}
				}]
			});

			download.saveFile().catch(function(error) {
				MessageBox.error(error);
			}).then(function() {
				download.destroy();
			});
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		priorityFormatter: function(priotityText) {
			if (priotityText === "Normal") {
				return "Success";
			} else if (priotityText === "Urgent") {
				return "Warning";
			} else if (priotityText === "Immediate") {
				return "Error";
			} else {
				return "None";
			}
		},

		_createViewModel: function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Name/content",
				groupBy: "None"
			});
		},

		/**
		 * If the master route was hit (empty hash) we have to set
		 * the hash to to the first item in the list as soon as the
		 * listLoading is done and the first item in the list is known
		 * @private
		 */
		_onMasterMatched: function() {
			this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(
				function(mParams) {
					if (mParams.list.getMode() === "None") {
						return;
					}
					var sObjectId = mParams.firstListitem.getBindingContext().getProperty("ObjectID");
					this.getRouter().navTo("object", {
						objectId: sObjectId
					}, true);
				}.bind(this),
				function(mParams) {
					if (mParams.error) {
						return;
					}
					this.getRouter().getTargets().display("detailNoObjectsAvailable");
				}.bind(this)
			);
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function(oItem) {
			var bReplace = !Device.system.phone;
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("ObjectID")
			}, bReplace);

		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function(iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch: function() {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method to apply both group and sort state together on the list binding
		 * @param {sap.ui.model.Sorter[]} aSorters an array of sorters
		 * @private
		 */
		_applyGroupSort: function(aSorters) {
			this._oList.getBinding("items").sort(aSorters);
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar: function(sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		}

	});

});
sap.ui.define([
	"ServiceRequests/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"ServiceRequests/model/formatter",
	"sap/m/FeedListItem",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/StandardListItem",
	"sap/m/ListType",
	'sap/ui/model/odata/v2/ODataModel',
	'sap/ui/comp/valuehelpdialog/ValueHelpDialog',
	'sap/ui/table/Table',
	'sap/ui/comp/filterbar/FilterBar',
	"sap/ui/core/routing/History"
], function(BaseController, JSONModel, formatter, FeedListItem, MessageBox, MessageToast, StandardListItem, ListType, ODataModel, ValueHelpDialog, Table, FilterBar, History) {
	"use strict";

	return BaseController.extend("ServiceRequests.controller.Detail", {

		formatter: formatter,
		app: null,
		fileToUpload: null,
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {

			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});
			this.createNewTicket = false;
			var oView = this.getView();
			var _self = this;
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");
			var isMock = this.getOwnerComponent().mockData;
			if (isMock) {
				this._onMetadataLoaded();
				var mockModel = new JSONModel(jQuery.sap.getModulePath("ServiceRequests") + "/mock/serviceMockData.json");
				mockModel.attachRequestCompleted(function() {
					var mockModelData = this.getData();
					oView.setModel(new JSONModel(mockModelData.ServiceRequest), "ServiceRequest");
					oView.setModel(new JSONModel(mockModelData.LifeCycleModel), "LifeCycleModel");
					oView.setModel(new JSONModel({results: []}), "IncidentModel");
					_self.selectInfoService();
					_self.setSelectsToBusy(false);
					_self.getIncidentCategoryList();
					_self.mockModelLoaded = true;
				});
				this.setModel(mockModel, "MockModel");
			} else {
				this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
			}
			var URLS = this.getOwnerComponent().SELECT_BOX_URLS;
			this.app = this.getOwnerComponent().getAggregation("rootControl");
			this.app.setBusyIndicatorDelay(0);
			oView.setBusyIndicatorDelay(0);
			if (isMock) {
				var serviceModel = oView.getModel("ServiceRequest");
				if (!serviceModel) {
					this.setSelectsToBusy(true);
				}
			} else {
				var url = jQuery.sap.getModulePath("ServiceRequests") + "/destinations/c4c/sap/byd/odata/v1/c4codata/";
				var incidentModel = new JSONModel({results: []});
				var oModel = new ODataModel(url, {json: true, useBatch: false});
				oModel.read(URLS.ServicePriorityCode, {
					success: _self.infoPriorityReceived.bind(_self),
					error: _self.onErrorODataRead
				});
				this.setModel(oModel, "ServiceRequest");
				this.setModel(incidentModel, "IncidentModel");
			}
		},
		selectInfoService: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding(),
				sPath;
			if (oElementBinding) {
				sPath = oElementBinding.getPath();
			} else {
				//if no element was selected, select first on mockItems
				sPath = '/ServiceRequestCollection/0';
			}
			var oModel = this.getModel(),
				selectedKey = oModel.getObject(sPath).ServiceIssueCategoryID;
			oView.byId("infoServiceCategorySelect").setSelectedKey(selectedKey);
		},
		onErrorODataRead: function(jqXHR) {
			var error = jqXHR.responseJSON.error.message.value;
			MessageBox.error(error);
		},
		infoPriorityReceived: function(oData) {
			var hiddenPriorityCodes = this.getOwnerComponent().getManifest()['sap.cloud.portal'].settings.hiddenPriorityCodes,
				priorityData = oData.results,
				filteredPriorityData = [];
			if (hiddenPriorityCodes) {
				for (var i = 0; i < priorityData.length; i++) {
					if (hiddenPriorityCodes.indexOf(parseInt(priorityData[i].Code)) === -1) {
						filteredPriorityData.push(priorityData[i]);
					}
				}
			}
			var lifeCycleModel = new JSONModel({filteredResults: filteredPriorityData, results: priorityData}),
				oView = this.getView();
			oView.setModel(lifeCycleModel, "LifeCycleModel");
		},

		setSelectsToBusy: function(val) {
			var oView = this.getView();
			oView.byId("infoPrioritySelect").setBusy(val);
			oView.byId("infoProductCategorySelect").setBusy(val);
			oView.byId("infoServiceCategorySelect").setBusy(val);
			oView.byId("infoIncidentCategorySelect").setBusy(val);
		},

		onPost: function(oEvent) {
			var view = this.getView(),
				model = view.getModel(),
				sPath = view.getElementBinding().getPath(),
				authorUUID = this.getOwnerComponent().contactUUID,
				text = oEvent.getSource().getValue();
			if (!this.getOwnerComponent().mockData) {
				var url = model.sServiceUrl + sPath + "/ServiceRequestDescription",
					token = model.getSecurityToken();
				this.app.setBusy(true);
				jQuery.ajax({
					url: url,
					method: "POST",
					contentType: "application/json",
					headers: {
						"X-CSRF-TOKEN": token
					},
					data: JSON.stringify({
						TypeCode: "10008",
						AuthorUUID: authorUUID,
						Text: text
					}),
					success: function() {
						this.getModel().refresh();
					}.bind(this),
					error: function(jqXHR) {
						var error = jqXHR.responseJSON.error.message.value;
						MessageBox.error(error);
					},
					complete: function() {
						this.app.setBusy(false);
					}.bind(this)
				});
			} else {
				var serviceData = model.getData().ServiceRequestCollection[parseInt(view.getElementBinding().getPath().split("/")[2])].ServiceRequestDescription;
				var user = sap.ushell.Container.getUser();
				var dataDescription = {
					TypeCode: "10008",
					AuthorName: user.getFullName(),
					Text: text,
					CreatedOn: new Date()
				};
				serviceData.push(dataDescription);
				model.refresh();
				this._populateDescriptionsList(view.getElementBinding().getPath());
			}
		},

		onAttachmentPress: function(oEvent) {
			var item = oEvent.getParameter("listItem");
			var link = document.createElement("a");
			if (item.data("uri").fileBlob) {
				link.href = URL.createObjectURL(item.data("uri").fileBlob);
				link.download = item.data("uri").Name;
			} else {
				link.href = item.data("uri");
				link.download = item.getAggregation("cells")[0].getText();
			}
			link.click();
		},
		onEdit: function() {
			this._setEditMode(true);
		},
		onCancel: function() {
			this._setEditMode(false);
		},
		onSave: function() {
			var view = this.getView(),
				model = view.getModel();
			var patch = {
				ServicePriorityCode: view.byId("infoPrioritySelect").getSelectedKey(),
				ProductID: view.byId("infoProductCategorySelect").getSelectedKey(),
				ServiceIssueCategoryID: view.byId("infoServiceCategorySelect").getSelectedKey(),
				IncidentServiceIssueCategoryID: view.byId("infoIncidentCategorySelect").getSelectedKey()
			};

			var patchMock = {
				ServicePriorityCode: view.byId("infoPrioritySelect").getSelectedKey(),
				ServicePriorityCodeText: view.byId("infoPrioritySelect").getSelectedItem().getProperty("text"),
				ProductID: view.byId("infoProductCategorySelect").getSelectedKey(),
				ServiceIssueCategoryID: view.byId("infoServiceCategorySelect").getSelectedKey()
			};

			if (this.getOwnerComponent().mockData) {
				var sPathMock = view.getElementBinding().getPath(),
					ind = parseInt(sPathMock.split('/')[2]),
					data = model.getData(),
					arr = data.ServiceRequestCollection,
					objToUpdate = arr[ind];
				jQuery.extend(true, objToUpdate, patchMock);
				MessageToast.show("The service request was updated successfully");
				model.setData(data);
				model.refresh(true);
				this._setEditMode(false);
			} else {
				this.app.setBusy(true);
				var sPath = view.getElementBinding().getPath(),
					url = model.sServiceUrl + sPath,
					token = model.getSecurityToken();
				jQuery.ajax({
					url: url,
					method: "PATCH",
					contentType: "application/json",
					headers: {
						"X-CSRF-TOKEN": token
					},
					data: JSON.stringify(patch),
					success: function() {
						MessageToast.show("The service request was updated successfully");
						this.getModel().refresh();
					}.bind(this),
					error: function(jqXHR) {
						var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
						var error = elm.innerHTML || elm.textContent;
						MessageBox.error(error);
					},
					complete: function() {
						this.app.setBusy(false);
						this._setEditMode(false);
					}.bind(this)
				});
			}
		},

		onServiceCategorySelect: function() {
			this.getIncidentCategoryList();
		},

		onSetToComplete: function(oEvent) {
			var patch = {ServiceRequestLifeCycleStatusCode: "3"},
				oModel = this.getModel(),
				oView = this.getView();
			this.app.setBusy(true);
			var sPath = oView.getElementBinding().getPath(),
				url = oModel.sServiceUrl + sPath,
				token = oModel.getSecurityToken();
			jQuery.ajax({
				url: url,
				method: "PATCH",
				contentType: "application/json",
				headers: {
					"X-CSRF-TOKEN": token
				},
				data: JSON.stringify(patch),
				success: function() {
					MessageToast.show("The service request was set to completed");
					this.getModel().refresh();
				}.bind(this),
				error: function(jqXHR) {
					var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
					var error = elm.innerHTML || elm.textContent;
					MessageBox.error(error);
				},
				complete: function() {
					this.app.setBusy(false);
					this._setEditMode(false);
				}.bind(this)
			});
		},
		onFileChange: function(oEvent) {
			this.fileToUpload = oEvent.getParameter("files")["0"];
		},
		onFileUpload: function() {
			if (this.fileToUpload) {
				this.app.setBusy(true);
				var fileReader = new FileReader();
				fileReader.onload = this.uploadFile.bind(this);
				fileReader.readAsBinaryString(this.fileToUpload);
			} else {
				MessageBox.show("No file was selected");
			}
		},
		uploadFile: function(e) {
			var view = this.getView(),
				model = view.getModel(),
				sPath = view.getElementBinding().getPath();

			if (!this.getOwnerComponent().mockData) {
				var url = model.sServiceUrl + sPath + "/ServiceRequestAttachmentFolder",
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
					success: function() {
						view.byId("fileUploader").clear();
						this.fileToUpload = null;
						MessageToast.show("The attachment was uploaded successfully");
						this.getModel().refresh();
					}.bind(this),
					error: function(jqXHR) {
						var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
						var error = elm.innerHTML || elm.textContent;
						MessageBox.error(error);
					},
					complete: function() {
						this.app.setBusy(false);
					}.bind(this)
				});
			} else {
				var data = {
					Name: this.fileToUpload.name,
					fileBlob: new Blob([this.fileToUpload], {type: "any"})
				};
				var attachmentData = model.getData().ServiceRequestCollection[parseInt(view.getElementBinding().getPath().split("/")[2])].ServiceRequestAttachmentFolder;
				attachmentData.push(data);
				model.refresh();
				view.byId("fileUploader").clear();
				this.fileToUpload = null;
				MessageToast.show("The attachment was uploaded successfully");
				this._populateAttachmentsList(view.getElementBinding().getPath());
			}
		},
		initIncidentModel: function(data) {
			var oView = this.getView(),
				incidentModel = oView.getModel("IncidentModel");
			incidentModel.setData(data);
			incidentModel.refresh();
			oView.byId("infoIncidentCategorySelect").setBusy(false);
		},
		onErrorIncidentModel: function(jqXHR) {
			var error = jqXHR.responseJSON.error.message.value;
			MessageBox.error(error);
			this.getView().byId("infoIncidentCategorySelect").setBusy(false);
		},
		getIncidentCategoryList: function() {
			var oView = this.getView(),
				parentObject = oView.byId("infoServiceCategorySelect").getSelectedItem().data("parentObject"),
				oModel = oView.getModel("ServiceRequest"),
				_self = this,
				URLS = this.getOwnerComponent().SELECT_BOX_URLS;
			oView.byId("infoIncidentCategorySelect").setBusy(true);
			if (this.getOwnerComponent().mockData) {
				var mockModelData = oView.getModel("MockModel").getData();
				var incidentModel = mockModelData.ServiceRequest.IncidentModel;
				this.initIncidentModel(incidentModel[parentObject]);
			} else {
				oModel.read(URLS.IncidentCategory.replace('${0}', parentObject), {
					success: _self.initIncidentModel.bind(_self),
					error: _self.onErrorIncidentModel.bind(_self)
				});
			}

		},
		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */
		_setEditMode: function(isEdit) {
			var view = this.getView();
			view.byId("save").setVisible(isEdit);
			view.byId("cancel").setVisible(isEdit);
			view.byId("edit").setVisible(!isEdit);
			view.byId("infoPrioritySelect").setEnabled(isEdit);
			view.byId("infoProductCategorySelect").setEnabled(isEdit);
			view.byId("infoServiceCategorySelect").setEnabled(isEdit);
			view.byId("infoIncidentCategorySelect").setEnabled(isEdit);
		},
		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			if (this.getOwnerComponent().mockData) {
				var collection = this.getModel().getData().ServiceRequestCollection;
				for (var i = 0; i < collection.length; i++) {
					if (collection[i].ObjectID === sObjectId) {
						break;
					}
				}
				this._bindView("/ServiceRequestCollection/" + i);
			} else {
				this.getModel().metadataLoaded().then(function() {
					var sObjectPath = this.getModel().createKey("ServiceRequestCollection", {
						ObjectID: sObjectId
					});
					this._bindView("/" + sObjectPath);
				}.bind(this));
			}


		},
		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");
			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: "ServiceRequestDescription,ServiceRequestAttachmentFolder"
				},
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
						this._populateDescriptionsList(sObjectPath);
						this._populateAttachmentsList(sObjectPath);
					}.bind(this)
				}
			});

		},
		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();
			var isMock = this.getOwnerComponent().mockData;
			if (!isMock || (isMock && this.mockModelLoaded)) {
				this.getIncidentCategoryList();
			}

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}
			var sPath = oElementBinding.getPath();
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
			this._populateDescriptionsList(sPath);
			this._populateAttachmentsList(sPath);
		},
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {shellHash: "#Shell-home"}
				});
			}
		},
		_populateDescriptionsList: function(sPath) {
			var list = this.getView().byId("descriptionsList");
			var descriptions = this.getModel().getObject(sPath).ServiceRequestDescription;

			list.removeAllItems();
			if (descriptions.forEach) {
				descriptions.sort(function(a, b) {
					return a.CreatedOn.getTime() - b.CreatedOn.getTime();
				});
				var sender, info, typeCode;
				descriptions.forEach(function(description) {
					typeCode = description.TypeCode;
					if (typeCode === "10004") {
						sender = description.AuthorName;
						info = "Description";
					} else if (typeCode === "10008") {
						sender = description.AuthorName;
						info = "Reply from Customer";
					} else if (typeCode === "10007" || typeCode === '10011') {
						sender = "Service Agent";
						info = "Reply to Customer";
					} else if (typeCode === "10008") {
						sender = description.AuthorName;
						info = "Reply from Customer";
					}
					list.addItem(new FeedListItem({
						showIcon: false,
						sender: sender,
						text: description.Text,
						info: info,
						timestamp: description.CreatedOn.toLocaleString()
					}));
				});
			}
		},
		_populateAttachmentsList: function(sPath) {
			var oView = this.getView();
			var list = oView.byId("attachmentsList");
			var attachments = this.getModel().getObject(sPath).ServiceRequestAttachmentFolder;
			var attachmentModel = new JSONModel(attachments);
			oView.setModel(attachmentModel, "AttachmentModel");
			oView.getModel("AttachmentModel").refresh();
			var listItems = list.getItems(),
				mockData = this.getOwnerComponent().mockData;
			for (var i = 0; i < listItems.length; i++) {
				listItems[i].data("uri", mockData ? (attachments[i].__metadata ? attachments[i].__metadata.uri + "/Binary/$value" : attachments[i]) : attachments[i].__metadata.uri + "/Binary/$value");
			}
			this.app.setBusy(false);
		},
		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		}

	});

});
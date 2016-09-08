sap.ui.define([
	"ServiceRequests/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"ServiceRequests/model/formatter",
	"sap/m/FeedListItem",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/StandardListItem",
	"sap/m/ListType"
], function(BaseController, JSONModel, formatter, FeedListItem, MessageBox, MessageToast, StandardListItem, ListType) {
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
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");

			if (this.getOwnerComponent().mockData) {
				this._onMetadataLoaded();
				this.getView().byId("uploadFileButton").setEnabled(false);
				this.getView().byId("interactionInput").setEnabled(false);
			} else {
				this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
			}

			this.app = this.getOwnerComponent().getAggregation("rootControl");
			this.app.setBusyIndicatorDelay(0);
			this.getView().setBusyIndicatorDelay(0);
		},

		onPost: function(oEvent) {
			var view = this.getView(),
				model = view.getModel(),
				sPath = view.getElementBinding().getPath(),
				authorUUID = this.getOwnerComponent().contactUUID,
				text = oEvent.getSource().getValue();

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
		},

		onAttachmentPress: function(oEvent) {
			var item = oEvent.getParameter("listItem");
			var link = document.createElement("a");
			link.href = item.data("uri");
			link.download = item.getTitle();
			link.click();
		},

		onEdit: function() {
			this._setEditMode(true);
		},

		onCancel: function() {
			this._setEditMode(false);
		},

		onSave: function() {
			if (this.getOwnerComponent().mockData) {
				MessageToast.show("The service request was updated successfully");
				this._setEditMode(false);
				return;
			}

			this.app.setBusy(true);

			var view = this.getView(),
				model = view.getModel(),
				sPath = view.getElementBinding().getPath(),
				url = model.sServiceUrl + sPath,
				token = model.getSecurityToken();

			var patch = {
				ServiceRequestLifeCycleStatusCode: view.byId("infoStatusSelect").getSelectedKey(),
				ServicePriorityCode: view.byId("infoPrioritySelect").getSelectedKey(),
				ProductID: view.byId("infoProductCategorySelect").getSelectedKey(),
				ServiceIssueCategoryID: view.byId("infoServiceCategorySelect").getSelectedKey()
			};

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
					var error = jqXHR.responseXML.getElementsByTagName("message")[0].innerHTML;
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
				sPath = view.getElementBinding().getPath(),
				url = model.sServiceUrl + sPath + "/ServiceRequestAttachmentFolder",
				token = model.getSecurityToken();

			var data = {
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
				data: JSON.stringify(data),
				success: function() {
					view.byId("fileUploader").clear();
					this.fileToUpload = null;
					MessageToast.show("The attachment was uploaded successfully");
					this.getModel().refresh();
				}.bind(this),
				error: function(jqXHR) {
					var error = jqXHR.responseXML.getElementsByTagName("message")[0].innerHTML;
					MessageBox.error(error);
				},
				complete: function() {
					this.app.setBusy(false);
				}.bind(this)
			});
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_setEditMode: function(isEdit) {
			var view = this.getView();

			view.byId("save").setVisible(isEdit);
			view.byId("cancel").setVisible(isEdit);
			view.byId("edit").setVisible(!isEdit);

			view.byId("infoStatusSelect").setEnabled(isEdit);
			view.byId("infoPrioritySelect").setEnabled(isEdit);
			view.byId("infoProductCategorySelect").setEnabled(isEdit);
			view.byId("infoServiceCategorySelect").setEnabled(isEdit);
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
					expand: "ServiceRequestDescription,ServiceRequestAttachmentFolder",
					select: "*,ServiceRequestDescription/*,ServiceRequestAttachmentFolder/Name,ServiceRequestAttachmentFolder/CreatedOn,ServiceRequestAttachmentFolder/DocumentLink"
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
					} else if (typeCode === "10007") {
						sender = description.CreatedBy;
						info = "Reply to customer";
					} else if (typeCode === "10008") {
						sender = description.AuthorName;
						info = "Reply from customer";
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
			var list = this.getView().byId("attachmentsList");
			var attachments = this.getModel().getObject(sPath).ServiceRequestAttachmentFolder;

			list.removeAllItems();
			if (attachments.forEach) {
				attachments.forEach(function(attachment) {
					list.addItem(new StandardListItem({
						type: ListType.Active,
						title: attachment.Name
					}).data("uri", attachment.__metadata.uri + "/Binary/$value"));
				});
			}
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
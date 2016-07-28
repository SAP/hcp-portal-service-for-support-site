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

			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
			// Put down master list's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the master list is
			// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();

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

			var componentData = this.getOwnerComponent().getComponentData();
			if (this.mockData && componentData && componentData.startupParameters &&
				componentData.startupParameters.createNewTicket && !this.initialCreateTicketOpened) {
				this.initialCreateTicketOpened = true;
				this.onAdd();
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

								var componentData = this.getOwnerComponent().getComponentData();
								if (componentData && componentData.startupParameters && componentData.startupParameters.createNewTicket && !this.initialCreateTicketOpened) {
									this.initialCreateTicketOpened = true;
									this.onAdd();
								}
							}.bind(this),
							error: function(jqXHR) {
								MessageBox.error(jqXHR.responseXML.getElementsByTagName("message")[0].innerHTML);
							}
						});
					} else {
						MessageToast.show("You cannot view or create tickets because your email " + userEmail + " is not assigned to a contact in the C4C tenant");
					}
				}.bind(this),
				error: function(jqXHR) {
					MessageBox.error(jqXHR.responseXML.getElementsByTagName("message")[0].innerHTML);
				}
			});
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
			if (!this._oList.getSelectedItem() && items.length > 0) {
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

		onAdd: function() {
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("ServiceRequests.fragment.Create", this);
				this.oDialog.attachAfterClose(function() {
					this.oDialog.destroy();
					this.oDialog = null;
				}.bind(this));

				if (this.mockData) {
					sap.ui.getCore().byId("addDialogCreateButton").setEnabled(false);
				}

				this.getView().addDependent(this.oDialog);
			}
			this.oDialog.open();
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

			var model = view.getModel(),
				url = model.sServiceUrl + "/ServiceRequestCollection",
				token = model.getSecurityToken();

			var data = {
				ReporterPartyID: this.contactID,
				Name: {
					content: titleInput.getValue()
				},
				ServiceRequestLifeCycleStatusCode: "1",
				ServicePriorityCode: core.byId("createPriority").getSelectedKey(),
				ProductID: core.byId("createProductCategory").getSelectedKey(),
				ServiceIssueCategoryID: core.byId("createServiceCategory").getSelectedKey()
			};

			this.oDialog.setBusy(true);
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
					var error = jqXHR.responseXML.getElementsByTagName("message")[0].innerHTML;
					MessageBox.error(error);
					this.oDialog.setBusy(false);
				}.bind(this)
			});
		},

		setTicketDescription: function(result) {
			var model = this.getModel(),
				authorUUID = this.component.contactUUID,
				baseUrl = result.getElementsByTagName("id")[0].innerHTML,
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
		},

		uploadAttachment: function(result) {
			if (this.fileToUpload) {
				var fileReader = new FileReader();
				fileReader.onload = function(e) {
					this.uploadFile(e, result);
				}.bind(this);
				fileReader.readAsBinaryString(this.fileToUpload);
			} else {
				this.finishCreateTicket();
			}
		},

		uploadFile: function(e, result) {
			var model = this.getModel(),
				url = result.getElementsByTagName("id")[0].innerHTML + "/ServiceRequestAttachmentFolder",
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
				success: this.finishCreateTicket.bind(this),
				error: function(jqXHR) {
					var error = jqXHR.responseXML.getElementsByTagName("message")[0].innerHTML;
					MessageBox.error("The service request was created successfully, but the attachment could not be uploaded: " + error);
					this.oDialog.setBusy(false);
				}
			});
		},

		finishCreateTicket: function() {
			MessageToast.show("The service request was created successfully");
			this.oDialog.setBusy(false);
			this.getModel().refresh();
			this.oDialog.close();
		},

		onDialogCancel: function() {
			this.oDialog.close();
		},

		setListFilters: function() {
			var componentData = this.getOwnerComponent().getComponentData();

			if (!this.mockData) {
				var userEmail = sap.ushell.Container.getUser().getEmail();
				this._oListFilterState.aFilter.push(new Filter("ReporterEmail", FilterOperator.EQ, userEmail));
			}

			if (componentData && componentData.startupParameters) {
				if (componentData.startupParameters.pendingResponse) {
					this._oListFilterState.aFilter.push(new Filter("ServiceRequestUserLifeCycleStatusCode", FilterOperator.EQ, "4"));
				} else {
					this._oListFilterState.aFilter.push(new Filter("ServiceRequestUserLifeCycleStatusCodeText", FilterOperator.NE, "Completed"));
					if (componentData.startupParameters.highPriority) {
						this._oListFilterState.aFilter.push(new Filter("ServicePriorityCode", FilterOperator.LT, "3"));
					}
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

				columns: [
					{
						name: "Title",
						template: {
							content: "{Name/content}"
						}
					},
					{
						name: "Priority",
						template: {
							content: "{ServicePriorityCodeText}"
						}
					},
					{
						name: "Status",
						template: {
							content: "{ServiceRequestUserLifeCycleStatusCodeText}"
						}
					},
					{
						name: "Product Category",
						template: {
							content: "{ProductCategoryDescription}"
						}
					},
					{
						name: "Service Category",
						template: {
							content: "{ServiceCategoryName/content}"
						}
					}
				]
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
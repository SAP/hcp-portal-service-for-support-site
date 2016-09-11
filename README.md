# Welcome to the SAP HANA Cloud Platform, Portal Service for Support Site GitHub Repository

The SAP HCP portal service for Support Site repository provides all you need to deploy the Support Site solution on your HCP account and connect it to your SAP Hybris Cloud for Customer (C4C) tenant. Click [here](https://hcp.sap.com/capabilities/ux/cloud-portal.html) to receive more information on using SAP HCP portal service.

## How to Deploy the Support Site Sample Solution

[Watch the configuration video](https://youtu.be/wikqPJQ_LKY)

This guide will show you how to download the Support Site sample solution from the SAP HANA Cloud Platform, portal service GitHub repository and deploy it to your account.

The Support Site solution includes several components:

1. Portal service site template with support-related predefined content
2. SAPUI5 theme
3. Service Requests application for integrating with SAP Hybris Cloud for Customer (C4C)
4. [Optional] SAP Jam Group Feed and SAP Jam Search widgets 

### Prerequisites

1. SAP HANA Cloud Platform (HCP) productive account (the solution does not work with a trial account)
2. C4C tenant
3. [Optional] SAP Jam tenant

### Prepare the Landscape

1. In your HCP cockpit, create a destination to your C4C tenant by importing the destination file you extracted from GitHub, c4c, and use the following configuration:
  
  Property | Value
  --- | ---
  Name | c4c
  Type | HTTP
  URL | https://myXXXXXX.crm.ondemand.com
  Proxy type | Internet
  Authentication | BasicAuthentication
  User | technical_user_name
  Password | technical_user_password

2. [Optional] Create a trust between your HCP account and your Jam tenant, and create a destination to your Jam tenant, as described [here](http://help.sap.com/download/documentation/sapjam/developer/index.html#hcp/concepts/ADVANCED_TOPICS-API_integrate_features_data.html).

### Download and Deploy the Applications

1. Navigate to https://github.com/SAP/hcp-portal-service-for-support-site
2. Clone the repository to your computer, or download it as a ZIP file by clicking the “Clone or download” button and selecting “Download ZIP”, and extract its contents.
3. Import the following applications to your account:
 * supportsitetemplate.zip (Site template)
 * servicerequests.zip (Service Requests application)

  You can import the files to SAP Web IDE and then deploy them to HCP, or you can directly deploy them to HCP through the HCP cockpit (Applications >> HTML5 Applications >> Import from File). Click [here](https://help.hana.ondemand.com/webide/frameset.htm?344e8c91e33b4ae8b4032709c45776a3.html) to receive more information on using SAP Web IDE.
  
4. You may also download two optional SAP Jam widgets from https://github.com/SAP/hcp-portal-service-samples (under the widgets folder):
 * jamgroupfeed.zip (Jam Group Feed widget)
 * jamsearch.zip (Jam Search widget)

### Import the SAPUI5 theme

1. Navigate to your portal service Admin Space, and select Service  Theme Manager.
2. Import the theme file you extracted from GitHub, supportsitetheme.zip.

### Create a new site

1. Still in the Admin Space, navigate to the Site Directory and create a new site based on the Support Site template.
2. [Optional] Configure each of the SAP Jam widgets by selecting the widget and then clicking the settings icon. 
 * For the SAP Jam Group Feed widget, select the group. The widget will show the group feed and allow users to post to the group. 
 * For the SAP Jam Search widget, you can configure the default query. The widget allows the user to search for content in the SAP Jam tenant.
 * Note: The SAP Jam widgets are part of the site template and are created automatically as part of the site’s initial content. If you did not deploy the SAP Jam applications, these sections will show an error message. In this case, simply click on the sections and delete the widgets.
3. Publish the site. That’s all – your Support Site is ready!


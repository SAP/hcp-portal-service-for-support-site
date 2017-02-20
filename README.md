# Welcome to the SAP HANA Cloud Platform, Portal Service for Support Site GitHub Repository
 
The SAP HCP portal service for the Support Site repository provides all you need to deploy the Support Site solution on your HCP account and connect it to your SAP Hybris Cloud for Customer (C4C) tenant. Click [here](https://hcp.sap.com/capabilities/ux/cloud-portal.html) to receive more information on using SAP HCP portal service.
 
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
 
1. In your SAP HCP cockpit, create a destination to your C4C tenant by importing the destination file you extracted from GitHub, c4c, and use the following configuration:
  
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
 
1. Navigate to https://github.com/SAP/hcp-portal-service-for-support-site/releases
2. Download all the files from the latest release to your computer. You can also download the source code.
3. Import the following applications to your account:
 * supportsitetemplate.zip (Site template)
 * servicerequests.zip (Service Requests application)
  
  You can import the files to SAP Web IDE and then deploy them to HCP, or you can directly deploy them to HCP through the HCP cockpit (Applications >> HTML5 Applications >> Import from File). Click [here](https://help.hana.ondemand.com/webide/frameset.htm?344e8c91e33b4ae8b4032709c45776a3.html) to receive more information on using SAP Web IDE.
  
4. You may also download two optional SAP Jam widgets from https://github.com/SAP/hcp-portal-service-samples (under the widgets folder):
 * jamgroupfeed.zip (Jam Group Feed widget)
 * jamsearch.zip (Jam Search widget)
 
### Import the SAPUI5 Theme
 
1. Navigate to your portal service Admin Space, and select Services -> Theme Manager.
2. Import the theme file you downloaded from GitHub, supportsitetheme.zip.
 
  Note: The theme file supportsitetheme.zip is compatible with the *innovation* version of SAPUI5. If you want to use the *stable* version of SAPUI5 in your site, import supportsitetheme-stable.zip instead.
 
### Create a New Site
 
1. Still in the Admin Space, navigate to the Site Directory and create a new site based on the Support Site template.
2. Each page is made up of the following widgets:  Configure the following widgets according to the page:
* **Community Page**:  HTML, Rich Text Editor, Tile Grid and SAP Jam Group Feed
* **Dashboard Page**: Accesses the Manage Groups editor
* **Home Page**: HTML, Rich Text Editor
* **Knowledge Base**: HTML, SAP Jam Search
 
  For more information about each of these out of the box widgets, see **About Widgets**  below.
 
3. Publish the site.  That's it – your Support Site is ready!
 
## About Widgets
* **HTML Widget**: Enter your HTML code or upload it from your computer or from the Asset Repository. The size limit for HTML files is 5 MB. 
* **Rich Text Editor**: Write text, format it, create tables, add links, paste content from WORD, upload images and much more to quickly and easily populate your site with content. 
* **Tile Grid**: Create a grid of tiles that includes images and text. Add and arrange them and define their content and visual appearance.
* **SAP JAM Widgets**: Use the following SAP Jam widgets to embed content from SAP Jam into your site pages to share knowledge with your team: 
  * **SAP Jam Group Feed**: Select a group. The widget will show the group feed and allow end users to post to the group.
  * **SAP Jam Search**: Configure a default query to enable end users to search for content in the SAP Jam tenant.
  * **Prerequisite**:  Make sure you are connected to SAP Jam and that you have enabled integration with SAP Jam in the Site Settings.
  
    Note that the SAP Jam widgets are part of the site template and are created automatically as part of the site’s initial content. If you did not deploy the SAP Jam applications, these sections will show an error message. In this case, simply click on the sections and delete the widgets.
 
 
## Extend the Sample Solution for Productive Use
 
The sample solution provided in this repository is intended to be used as an accelerator for a productive implementation, adapting and extending it to fit a specific customer's requirements. The solution uses cutting-edge front-end technologies like SAPUI5 and the OData open protocol, and extending the solution requires adequate knowledge of these technologies.
 
You can use the following resources to learn more:
* [SAP HANA Cloud Platform (HCP)](https://hcp.sap.com/developers.html)
* [HCP Portal Service](https://help.hana.ondemand.com/cloud_portal/frameset.htm)
* [SAPUI5: openSAP Course](https://open.sap.com/courses/ui51)
* [SAPUI5: Tutorials](https://sapui5.hana.ondemand.com/)
* [OData protocol](http://www.odata.org/)
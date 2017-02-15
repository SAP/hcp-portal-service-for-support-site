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
 
2. [Optional] Create a trust between your HCP account and your Jam tenant, and create a destination to your Jam tenant, as described [here](https://help.hana.ondemand.com/cloud_portal/frameset.htm?9b529041d0fe470d9c7c795eb4038e7a.html).
 
### Download and Deploy the Applications
 
1. Navigate to https://github.com/SAP/hcp-portal-service-for-support-site/releases
2. Download all the files from the latest release to your computer. You can also download the source code.
   Note
   There are two theme files.  Only download the one you need. 
   §	The theme file supportsitetheme.zip is compatible with the innovation version of SAPUI5. 
   §	The theme file supportsitetheme-stable.zip is compatible with the stable version of SAPUI5

3. Import the following applications to your account:
 * supportsitetemplate.zip (Site template)
 * servicerequests.zip (Service Requests application)
  
  Note
  You can import the files to SAP Web IDE and then deploy them to HCP, or you can directly deploy them to HCP through the HCP cockpit (Applications >> HTML5 Applications >> Import from File). Click [here](https://help.hana.ondemand.com/webide/frameset.htm?344e8c91e33b4ae8b4032709c45776a3.html) to receive more information on using SAP Web IDE.
 
### Import the SAPUI5 Theme
 
1. Navigate to your portal service Admin Space, and select Services -> Theme Manager.
2. Import the theme file you downloaded from GitHub, supportsitetheme.zip.
 
  Note: The theme file supportsitetheme.zip is compatible with the *innovation* version of SAPUI5. If you want to use the *stable* version of SAPUI5 in your site, import supportsitetheme-stable.zip instead.
 
### Create a New Site
 
1. Still in the Admin Space, navigate to the Site Directory and create a new site based on the Support Site template.
2. Each page is made up of the following widgets:  Configure the following widgets according to the page:
* **Community Page**:  Rich Text Editor, Image widget, Tile Grid and SAP Jam Group Feed
* **Dashboard Page**: Tile Grid (and accesses the Manage Groups editor)
* **Home Page**: Rich Text Editor, Image Widget, Tile Grid
* **Knowledge Base**: Rich Text Editor, Image Widget, SAP Jam Search
 
  For more information about each of these out of the box widgets, see **About Widgets**  below.
 
3. Publish the site.  That's it – your Support Site is ready!
 
## About Widgets
| Widget | More Information |
| ------ | ---------------- |
| **Rich Text Editor** | Write text, format it, create tables, add links, paste content from WORD, upload images and much more. Helps you to quickly and easily populate your site with content. Note! The Rich Text Editor is also incorporated into other widgets – such as the List Builder widget to enable the insertion of text and images. |
| **Tile Grid** | Create a grid of tiles that includes images and text. Add and arrange them and define their content and visual appearance. |
| **SAP JAM Widgets** | Use the following SAP Jam widgets to embed content from SAP Jam into your site pages to share knowledge with your team: <br><br> **Important!** <br> Make sure you are connected to SAP Jam and that you have enabled integration with SAP Jam in the Site Settings. <br><br> **SAP Jam Group Feed**: Displays the feed from a selected SAP Jam group in the site. The end user sees the group feed and can post to the group. <br> **SAP Jam Search**: Displays the results of a search query that you defined in the widget. This enables the end user to search for content. <br> **SAP Jam Content**: Displays content from a selected SAP Jam group. The end user can then navigate through the content and download files directly from the widget. <br><br> **Note!** The SAP Jam widgets are part of the site template and are created automatically as part of the site’s initial content. If you did not deploy the SAP Jam applications, these sections will show an error message. In this case, simply click on the sections and delete the widgets. |
 
 
## Extend the Sample Solution for Productive Use
 
The sample solution provided in this repository is intended to be used as an accelerator for a productive implementation, adapting and extending it to fit a specific customer's requirements. The solution uses cutting-edge front-end technologies like SAPUI5 and the OData open protocol, and extending the solution requires adequate knowledge of these technologies.
 
You can use the following resources to learn more:
* [SAP HANA Cloud Platform (HCP)](https://hcp.sap.com/developers.html)
* [HCP Portal Service](https://help.hana.ondemand.com/cloud_portal/frameset.htm)
* [SAPUI5: openSAP Course](https://open.sap.com/courses/ui51)
* [SAPUI5: Tutorials](https://sapui5.hana.ondemand.com/)
* [OData protocol](http://www.odata.org/)

## How to Edit a Support Site

This section provides you with guidelines to help you edit the predefined content of the out of the box Support Site. 
Prerequisite:  In the Site Directory, first open your support site for editing by clicking Edit.

**Note!** <br> The changes between sample versions are not guaranteed to be backwards compatible.

### Rebranding

| Question | More Information |
| -------- | ---------------- |
| **How do I change the company logo or background of the support site?** | 1.	Go to the Home page. <br>2.	On the left, click   to open Services and Tools. <br>3.	In the UI Theme Designer, click Configure.<br>4.	In order to change a logo, create a new theme as follows: <ul><li>a.	Click Create a New Theme.</li><li>b.	Follow the steps of the wizard and click Create Theme.</li><li>c.	On the right of the screen, select   (quick editing mode) and upload the company logo.</li><li>d.	From the Theme tab at the top left, select Export to create a zip file containing the new theme you created with the logo. For more information, see Exporting Themes.</li></ul><br>5.	Now go to the Theme Manager (also in Services and Tools) and click Configure. <br>6.	Browse for and upload the zip file with the updated theme that includes your logo. <br>7.	Click Assign to Site.
| **How can I change the name of the company?** | 8.	Go to the Home page. <br>9.	Click on the Rich Text Editor widget that contains the text "Welcome to Atomic Support" <br>10.	Click on pencil icon.  <br>11.	Edit the text. |

### Editing Content
| Question	| More information |
| -------- | ---------------- |
| **How can I remove or change the Contact Us information?**	| The Contact Us section inherits its content from the page template. Therefore to change or remove this content, you need to first disconnect the section from the page template and then you will be able to edit the content. <br><br>To remove the Contact Us information from a single page, do as follows: <br>13.	Click the section displaying the Contact Us details. <br>14.	Click   to disconnect the section from the page template. <br>15.	Click each section where you want to change or delete the content. <br>16.	Either click   to edit the content or click    to remove the content. <br><br>To change or remove the Contact Us information from all pages, you need to change the page template as follows: <br>17.	Click   to open Page Templates. <br>18.	Click the page template on which your support site is based (in this case, Header Footer). <br>19.	In the preview of the page on the right, click on each section of the footer to open the widget menu. <br>20.	Either edit or remove the Contact Us content. When you go back to your site, you will see that the Contact Us content has either been changed or deleted on every page that is based on this page template.
| **How do I change the content in other widgets?** |	21.	In your support site, click the widget that you want to edit. <br>22.	Next to the widget type, click    (edit) or in some cases   (settings) to change the content. |
| **How do I add a widget to an existing page?** |	23.	Open the page in your support site where you want to add a widget. <br>24.	Click the section to open the section menu on the right. <br>25.	Click + to add a widget to the section. <br><br> **Note!** <br> If you want to add more widgets to the section, do the following: i.	Click   to open the section settings on the right. ii.	Select a section layout and save. iii.	Then click + to add the widgets. |
| **How do I remove a widget?** |	26.	Click the widget to open the widget settings.<br>27.	Click  to delete. |
| **How do I remove a page?** |	28.	In the Pages and Apps panel in the Site Designer, click the page that you want to remove. <br>29.	Right click on the actions arrow   and select Delete. |
| **How do I remove SAP Jam integration?** |	30.	Open the site for editing. <br>31.	Go To Communities page. <br>32.	Click on the SAP Jam Group Feed Widget that contains the text "Select a JAM Group….". <br>33.	Click   to delete the widget. |
| **How do I connect the site to my JAM account?** |	To add SAP Jam functionality to your site, do the following: <br>*	Ensure that the end user has an SAP Jam account. <br>*	Set up your SAP HANA Cloud Platform account. <br>For more information, see Collaborating Using SAP Jam. |
| ** How do I add a new page to the menu?** |	34.	Right click the actions arrow   next to any page or app. <br>35.	Select Add to Menu. The Menu Editor opens. <br>36.	Click Save. <br>You can also do this directly in the Menu Editor   that you access from the left panel of the Site Designer. |

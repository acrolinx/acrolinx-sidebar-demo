/*
 *
 * * Copyright 2015-present Acrolinx GmbH
 * *
 * * Licensed under the Apache License, Version 2.0 (the "License");
 * * you may not use this file except in compliance with the License.
 * * You may obtain a copy of the License at
 * *
 * * http://www.apache.org/licenses/LICENSE-2.0
 * *
 * * Unless required by applicable law or agreed to in writing, software
 * * distributed under the License is distributed on an "AS IS" BASIS,
 * * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * * See the License for the specific language governing permissions and
 * * limitations under the License.
 * *
 * * For more information visit: https://www.acrolinx.com
 *
 */

/*global initAcrolinxSamplePlugin*/

'use strict';

var basicConf = {
  sidebarContainerId: 'sidebarContainer',
  //See: https://acrolinx.github.io/sidebar-interface/pluginDoc/interfaces/_index_.initparameters.html
  //serverAddress: 'https://amazon.acrolinx.cloud',
  serverAddress: 'https://amazon-enterprise.acrolinx.cloud',
  //serverAddress: 'https://playspace.acrolinx-cloud.net',
  //You'll get the clientSignature for your integration after a successful certification meeting.
  //See: https://support.acrolinx.com/hc/en-us/categories/10209837818770-Build-With-Acrolinx
  //clientSignature: 'eyJhbGciOiJFUzI1NiJ9.eyJpZCI6IjY4MTMyY2JlLTcyNzAtNmI2Ny0wMWI2LTc3MDAxNDExZDBlNyIsIm5hbWUiOiJBbWF6b24gQ2FyYm9uIERldiIsImlhdCI6MTc0NjA4NzI5OX0.zAQCeKgxguYp3qbOxKmBffOOeFJrghbBUnPsSQJ1fb3yqA6vVr_bdpXKt3VOSegv7C9zG3gtu5fRrJWMBc3jvQ; PoC v1.0.0', //DEV signature
  clientSignature: 'eyJhbGciOiJFUzI1NiJ9.eyJpZCI6IjY4OTI0NDkyLTcyNzAtNmI2Ny0wM2ZlLTllMDAxNGEzYmU1MSIsIm5hbWUiOiJBbWF6b24gQ2FyYm9uIFNpZGViYXIiLCJpYXQiOjE3NTQ0MjE4MjZ9.tx91Ce9wxnx_j_S7uI86dXzVwRzSMA_PnlypZgmB76Vhwas-GE1TZgQsLpM0vMSzhL2aMJFlZ_-BxhZL7P9ePg; PoC v1.0.0', //Prod signature

  /**
   * This callback can be used to set the documentReference.
   * It is called in the moment when the document is checked.
   * The default value is window.location.href.
   * In a CMS the link to the article might be a good documentReference.
   * On other cases the full file name might be a good option.
   * @return {string}
   */
  getDocumentReference: function () {
    return window.location.href;
  },

  log: localStorage.getItem('devAcrolinxLog') === 'true' && function (logEntry) {
    console.log('log:', logEntry);
  },

  /**
   * This optional function will be called after a successful check,
   * if Embed Check Data is enabled on the Acrolinx core server.
   * It’s the task of the integration to save the data in a suitable place.
   */
  // onEmbedCheckData: function (checkData, format) {
  //   console.log('Embed Check Data', checkData, format);
  // },

  //uiMode: 'noOptions',
  //clientLocale: 'en'
  //helpUrl: 'https://www.acrolinx.com',
  //showServerSelector: true,
  //readOnlySuggestions: true,

  //enableSingleSignOn: true, //see: https://github.com/acrolinx/acrolinx-proxy-sample

 clientComponents: [
    {
      version: '1.5.23',
      category: 'MAIN'
    }]
  //   {
  //     id: 'com.acrolinx.somecms',
  //     name: 'My CMS',
  //     version: '1.2.3.999'
  //   },
  //   {
  //     id: 'com.acrolinx.somelib',
  //     name: 'Referenced Lib',
  //     version: '1.0.0.0',
  //     category: 'DETAIL'
  //   },
  //   {
  //     id: 'com.acrolinx.anotherlib',
  //     name: 'Another Referenced Lib',
  //     version: '0.0.0.1',
  //     category: 'DETAIL'
  //   }
  // ]

  // This settings will overwrite the saved settings of the user.
  //checkSettings: {
  //  'profileId': 'bb276e04-1d75-11e9-9641-484d7eb8db4f'
  //}

  // If checkSettings is defined then the defaultCheckSettings will be ignored.
  //defaultCheckSettings: {
  //  'profileId': 'bc07ea88-1d75-11e9-8906-484d7eb8db4f'
  //}

};






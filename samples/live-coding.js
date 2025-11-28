/*
 *
 * * Copyright 2021-present Acrolinx GmbH
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

/*
  1. GoTo: [codemirror.net](https://codemirror.net/).
  2. Open Browser Console (F12).
  3. Paste this code to the console prompt.
  4. Hit enter key.
  5. The Sidebar should appear.
  6. Make sure that the sample CodeMirror has some text content. Use 'This is an tesst' for example.
  7. Use the Sidebar.
  8. To toggle the Sidebar from visible to invisible just run the code again(step 3 + 4)
*/

if (window.acrolinxSidebar) {
  window.acrolinxSidebar.toggleVisibility();
} else {
  var script = document.createElement('script'); script.src = "https://unpkg.com/@acrolinx/sidebar-sdk@1.1.14/dist/acrolinx-sidebar-sdk.js";
  script.addEventListener('load', function () {
    window.acrolinxSidebar = new acrolinx.plugins.initFloatingSidebar({ asyncStorage: new acrolinx.plugins.AsyncLocalStorage() });

    var acrolinxPlugin = new acrolinx.plugins.AcrolinxPlugin({
      serverAddress: 'https://partner-dev.internal.acrolinx.sh/',
      sidebarContainerId: 'acrolinxSidebarContainer',
      showServerSelector: false,
      clientSignature: 'SW50ZWdyYXRpb25EZXZlbG9wbWVudERlbW9Pbmx5',
      getDocumentReference: function () {
        return window.location.href;
      },
    });

    // Pass object of EditorView type here. view is already created on page load by codemirror.net
    acrolinxPlugin.registerAdapter(new acrolinx.plugins.adapter.CodeMirror6Adapter({ editor: view}));

    acrolinxPlugin.init();
  });

  document.head.appendChild(script);
}

import '../styles/index.scss';
import { SoftwareComponent } from '@acrolinx/sidebar-interface';
import { AcrolinxPluginConfig } from '@acrolinx/sidebar-sdk/dist/acrolinx-plugin';
import { AcrolinxPlugin, ContentEditableAdapter } from '@acrolinx/sidebar-sdk';

(() => {

  // Client components identify the important components used by your integration
  // eg: The integration itself can be set as category 'MAIN' component
  // Other examples could be Browser Name, Java Version, Editor version etc. These can be added as category 'DEFAULT' or 'DETAIL'
  const clientComponents: SoftwareComponent[] = [
    {
      id: 'com.company.integration',
      name: 'Acrolinx For Sample Editor',
      version: '1.0.0' + '.B' + '100',
      category: 'MAIN',
    }
  ];

  const basicConf: AcrolinxPluginConfig = {
    sidebarContainerId: 'sidebar-container',
    // Version >= '15.0.0' is only available with Acrolinx platform version 2021.12.1 or higher
    minimumSidebarVersion: '14.11.1',
    // Signature given to you by Acrolinx.
    clientSignature:
      'SW50ZWdyYXRpb25EZXZlbG9wbWVudERlbW9Pbmx5',
    clientComponents: clientComponents,
  };

  const plugin = new AcrolinxPlugin(basicConf)

  // Use an existing adapter or create your own adapter using AdapterInterface
  const adapter = new ContentEditableAdapter({editorId: 'editor'});

  // You can register several adapters, if you have multiple editors on the same page eg: CKEditor and TinyMCE on the same page
  // using MultiAdapter module provided by the SDK
  plugin.registerAdapter(adapter);

  plugin.init();
})();

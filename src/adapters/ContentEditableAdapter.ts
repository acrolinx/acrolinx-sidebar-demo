/*
 *
 * * Copyright 2015 Acrolinx GmbH
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
 * * For more information visit: http://www.acrolinx.com
 *
 */
namespace acrolinx.plugins.adapter {
  'use strict';

  export class ContentEditableAdapter extends AbstractRichtextEditorAdapter {
    element: Element;

    constructor(conf: AdapterConf) {
      super(conf);
      this.element = document.getElementById(conf.editorId);
    }

    getEditorElement(): Element {
      return this.element;
    }

    getHTML() {
      return this.element.innerHTML;
    }

    getEditorDocument(): Document {
      return this.element.ownerDocument;
    }

  }
}

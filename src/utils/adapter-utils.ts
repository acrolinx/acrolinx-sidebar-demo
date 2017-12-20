import * as _ from "lodash";
import {AutobindWrapperAttributes} from "../adapters/AdapterInterface";
import { CheckInformationKeyValuePair } from "../acrolinx-libs/plugin-interfaces";

export function getAutobindWrapperAttributes(element: Element) {
  const attributes: AutobindWrapperAttributes = {
    'original-id': element.id,
    'original-class': element.className,
    'original-name': (element as HTMLInputElement).name,
    'original-source': element.tagName.toLowerCase()
  };
  return _.omitBy(attributes, _.isEmpty) as AutobindWrapperAttributes;
}


export function getEmbedCheckDataAsEmbeddableString(checkInformation: CheckInformationKeyValuePair[], inputFormat: string) {
  let embeddableString = "";
  const ACROLINX_PROCESSING_INSTRUCTION_TAG_NAME = "acrolinxCheckData";

  if (checkInformation) {
    if (inputFormat === "HTML") {
      embeddableString = embeddableString.concat("<meta " + "name=\"" + ACROLINX_PROCESSING_INSTRUCTION_TAG_NAME + "\" ");
      checkInformation.forEach(element => {
        embeddableString = embeddableString.concat(element.key).concat("=").concat("\"").concat(element.value).concat("\" ");
        embeddableString = embeddableString.concat("/>");
        return embeddableString;
      });
    }
    else if (inputFormat === "XML") {
      let embeddableString = "";
      embeddableString = embeddableString.concat("<?" + ACROLINX_PROCESSING_INSTRUCTION_TAG_NAME + " ");
      checkInformation.forEach(element => {
        embeddableString = embeddableString.concat(element.key).concat("=").concat("\"").concat(element.value).concat("\" ");
        embeddableString = embeddableString.concat("?>");
        return embeddableString;
      });
    }
    else if (inputFormat === "MARKDOWN") {
      let embeddableString = "";
      embeddableString = embeddableString.concat("<!-- " + ACROLINX_PROCESSING_INSTRUCTION_TAG_NAME + " ");
      checkInformation.forEach(element => {
        embeddableString = embeddableString.concat(element.key).concat("=").concat("\"").concat(element.value).concat("\" ");
        embeddableString = embeddableString.concat("-->");
        return embeddableString;
      });
    }
  };
  return embeddableString;
}
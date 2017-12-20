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

import {Match, MatchWithReplacement, CheckResult, Check, DocumentSelection, CheckInformationKeyValuePair} from "../acrolinx-libs/plugin-interfaces";
import * as _ from "lodash";
import {TextDomMapping, extractTextDomMapping, getEndDomPos} from "../utils/text-dom-mapping";
import {AlignedMatch} from "../utils/alignment";
import {lookupMatches} from "../lookup/diff-based";
import {getCompleteFlagLength} from "../utils/match";
import {fakeInputEvent, assertElementIsDisplayed} from "../utils/utils";
import {
  AdapterInterface, AdapterConf, ContentExtractionResult, AutobindWrapperAttributes,
  ExtractContentForCheckOpts
} from "./AdapterInterface";
import {getAutobindWrapperAttributes, getEmbedCheckDataAsEmbeddableString} from "../utils/adapter-utils";


type TextMapping = TextDomMapping;

export abstract class AbstractRichtextEditorAdapter implements AdapterInterface {
  html: string;
  config: AdapterConf;
  currentHtmlChecking: string;
  isCheckingNow: boolean;
  prevCheckedHtml: string;
  inputFormat?: string;
  checkInformation?: CheckInformationKeyValuePair[];

  constructor(conf: AdapterConf) {
    this.config = conf;
  }

  abstract getEditorDocument(): Document;

  abstract getContent(): string;

  protected getEditorElement(): Element {
    return this.getEditorDocument().querySelector('body')!;
  }

  registerCheckCall(_checkInfo: Check) {
  }

  registerCheckResult(_checkResult: CheckResult): void {
    this.isCheckingNow = false;
    this.currentHtmlChecking = this.html;
    this.prevCheckedHtml = this.currentHtmlChecking;
    this.checkInformation = _checkResult.embedCheckInformation;
    this.inputFormat = _checkResult.inputFormat;
  }

  extractContentForCheck(opts: ExtractContentForCheckOpts): ContentExtractionResult {
    this.html = this.getContent();
    this.currentHtmlChecking = this.html;
    return {content: this.html, selection: opts.checkSelection ? this.getSelection() : undefined};
  }

  protected getSelection(): DocumentSelection | undefined {
    return undefined;
  }

  private scrollIntoView(sel: Selection) {
    const range = sel.getRangeAt(0);
    const tmp = range.cloneRange();
    tmp.collapse(false);

    const text = document.createElement('span');
    tmp.insertNode(text);
    text.scrollIntoView();
    this.scrollElementIntoView(text);
    text.remove();
  }

  scrollToCurrentSelection() {
    const selection1 = this.getEditorDocument().getSelection();

    if (selection1) {
      try {
        this.scrollIntoView(selection1);
      } catch (error) {
        console.log('Scrolling Error: ', error);
      }
    }
  }

  protected scrollElementIntoView(el: HTMLElement) {
    el.scrollIntoView();
  }

  selectRanges(checkId: string, matches: Match[]) {
    assertElementIsDisplayed(this.getEditorElement());
    this.selectMatches(checkId, matches);
    this.scrollToCurrentSelection();
  }


  private selectMatches<T extends Match>(_checkId: string, matches: T[]): [AlignedMatch<T>[], TextMapping] {
    const textMapping: TextMapping = this.getTextDomMapping();
    const alignedMatches: AlignedMatch<T>[] = lookupMatches(this.currentHtmlChecking, textMapping.text, matches);

    if (_.isEmpty(alignedMatches)) {
      throw new Error('Selected flagged content is modified.');
    }

    this.selectAlignedMatches(alignedMatches, textMapping);
    return [alignedMatches, textMapping];
  }

  private selectAlignedMatches(matches: AlignedMatch<Match>[], textMapping: TextMapping) {
    const newBegin = matches[0].range[0];
    const matchLength = getCompleteFlagLength(matches);
    this.selectText(newBegin, matchLength, textMapping);
  }

  private selectText(begin: number, length: number, textMapping: TextMapping) {
    if (!textMapping.text) {
      return;
    }
    const doc = this.getEditorDocument();
    const selection = doc.getSelection();
    selection.removeAllRanges();
    selection.addRange(this.createRange(begin, length, textMapping));
  }

  private createRange(begin: number, length: number, textMapping: TextMapping) {
    const doc = this.getEditorDocument();
    const range = doc.createRange();
    const beginDomPosition = textMapping.domPositions[begin];
    const endDomPosition = getEndDomPos(begin + length, textMapping.domPositions);

    // TODO: Handle overflowing offsets more clever and safer
    if (beginDomPosition.offset <= beginDomPosition.node.textContent!.length) {
      range.setStart(beginDomPosition.node, beginDomPosition.offset);
    } else {
      console.warn(`Offset of range begin (${beginDomPosition.offset}) > node text length (${beginDomPosition.node.textContent!.length})`);
    }

    if (endDomPosition.offset <= endDomPosition.node.textContent!.length) {
      range.setEnd(endDomPosition.node, endDomPosition.offset);
    } else {
      console.warn(`Offset of range end (${endDomPosition.offset}) > node text length (${endDomPosition.node.textContent!.length})`);
    }

    return range;
  }

  private replaceAlignedMatches(matches: AlignedMatch<MatchWithReplacement>[]) {
    const doc = this.getEditorDocument();
    const reversedMatches = _.clone(matches).reverse();
    for (let match of reversedMatches) {
      const textDomMapping = this.getTextDomMapping();
      const rangeLength = match.range[1] - match.range[0];
      if (rangeLength > 1) {
        const tail = this.createRange(match.range[0] + 1, rangeLength - 1, textDomMapping);
        const head = this.createRange(match.range[0], 1, textDomMapping);
        tail.deleteContents();
        head.deleteContents();
        head.insertNode(doc.createTextNode(match.originalMatch.replacement));
      } else {
        const range = this.createRange(match.range[0], rangeLength, textDomMapping);
        range.deleteContents();
        range.insertNode(doc.createTextNode(match.originalMatch.replacement));
      }
    }
  }

  replaceRanges(checkId: string, matchesWithReplacement: MatchWithReplacement[]) {
    assertElementIsDisplayed(this.getEditorElement());
    const [alignedMatches] = this.selectMatches(checkId, matchesWithReplacement);
    const replacement = alignedMatches.map(m => m.originalMatch.replacement).join('');
    this.replaceAlignedMatches(alignedMatches);

    // Replacement will remove the selection, so we need to restore it again.
    this.selectText(alignedMatches[0].range[0], replacement.length, this.getTextDomMapping());
    this.scrollToCurrentSelection();
    fakeInputEvent(this.getEditorElement());
  }

  private getTextDomMapping() {
    return extractTextDomMapping(this.getEditorElement());
  }

  getAutobindWrapperAttributes(): AutobindWrapperAttributes {
    return getAutobindWrapperAttributes(this.getEditorElement());
  }

  getEmbedCheckDataAsEmbeddableString(): string {
    if(this.checkInformation && this.inputFormat) {
      return getEmbedCheckDataAsEmbeddableString(this.checkInformation, this.inputFormat);
    }
    return "";
  }
}

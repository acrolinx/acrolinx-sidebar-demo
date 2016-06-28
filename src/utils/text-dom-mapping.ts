namespace acrolinx.plugins.utils {

  import _ = acrolinxLibs._;

  export interface TextDomMapping {
    text: string;
    domPositions: DomPosition[];
  }

  export interface DomPosition {
    node: Node;
    offset: number;
  }

  const EMPTY_TEXT_DOM_MAPPING: TextDomMapping = Object.freeze({
    text: '',
    domPositions: []
  });


  export function textMapping(text: string, domPositions: DomPosition[]): TextDomMapping {
    return {
      text: text,
      domPositions: domPositions
    };
  }

  export function concatTextMappings(textMappings: TextDomMapping[]): TextDomMapping {
    return {
      text: textMappings.map(tm => tm.text).join(''),
      domPositions: <DomPosition[]> _.flatten(textMappings.map(tm => tm.domPositions))
    };
  }

  export function domPosition(node: Node, offset: number): DomPosition {
    return {
      node: node,
      offset: offset
    };
  }

  const IGNORED_NODE_NAMES = toSet(['SCRIPT', 'STYLE']);

  export function extractTextDomMapping(node: Node): TextDomMapping {
    return concatTextMappings(_.map(node.childNodes, (child: Node) => {
        switch (child.nodeType) {
          case Node.ELEMENT_NODE:
            if (IGNORED_NODE_NAMES[child.nodeName]) {
              return EMPTY_TEXT_DOM_MAPPING;
            }
            return extractTextDomMapping(<HTMLElement> child);
          case Node.TEXT_NODE:
          default:
            return textMapping(child.textContent, _.times(child.textContent.length, (i: number) => domPosition(child, i)));
        }
      }
    ));
  }

  export function getEndDomPos(endIndex: number, domPositions: DomPosition[]): DomPosition {
    const index = domPositions[Math.max(Math.min(endIndex, domPositions.length) - 1, 0)];
    return {
      node: index.node,
      offset: index.offset + 1
    };
  }

}
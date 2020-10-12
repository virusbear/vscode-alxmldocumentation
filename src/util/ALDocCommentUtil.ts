import { ALObject } from "../types/ALObject";
import { ALProcedure } from "../types/ALProcedure";
import { ALParameter } from "../types/ALParameter";
import { ALProcedureReturn } from "../types/ALProcedureReturn";
import { ALObjectExtensionType } from "../types/ALObjectExtensionType";
import { ALObjectType } from "../types/ALObjectType";
import { TextEditor, TextDocument } from "vscode";
import { VSCodeApi } from "../api/VSCodeApi";

export class ALDocCommentUtil {
    /**
     * Create Object XML Documentation for given AL Object.
     * @param alObject ALObject object.
     */
    public static GenerateObjectDocString(alObject: ALObject, idx: number = -1): string {
        let docString = "";

        docString += "/// <summary> \n";
        docString += "/// ${" + ((idx === -1) ? "__idx__" : 1) + ":" + ALObjectType[alObject.Type] + " " + alObject.Name ;
        if (alObject.ID !== undefined) {
            docString += " (ID " + alObject.ID + ")";
        }
        if (alObject.ExtensionType !== undefined) {
            switch (alObject.ExtensionType) {
                case ALObjectExtensionType.Extend:
                    docString += " extends Record " + alObject.ExtensionObject;
                    break;
                case ALObjectExtensionType.Implement:
                    docString += " implements Interface " + alObject.ExtensionObject;
                    break;
            }
        }
        docString += ".}\n";
        docString += "/// </summary>";

        alObject.XmlDocumentation = docString;

        return docString;
    }

    /**
     * Create Procedure XML Documentation for given AL Procedure.
     * @param alProcedure ALProcedure object.
     */
    public static GenerateProcedureDocumentation(alProcedure: ALProcedure): string {
        let docString = "";
        let placeholderIdx = 0;

        if (alProcedure.Name === undefined) {
            return "";
        }

        placeholderIdx++;

        docString += alProcedure.XmlDocumentation.replace("__idx__",placeholderIdx.toString());

        if ((alProcedure.Parameters !== undefined) && (alProcedure.Parameters.length !== 0)) {
            alProcedure.Parameters.forEach(alParameter => {
                placeholderIdx++;
                docString += "\n";
                docString += alParameter.XmlDocumentation.replace("__idx__",placeholderIdx.toString());
            });
        }
        if (alProcedure.Return !== undefined) {
            placeholderIdx++;
            docString += "\n";
            docString += alProcedure.Return.XmlDocumentation.replace("__idx__",placeholderIdx.toString());
        }

        return docString;
    }
    
    /**
     * Generate Procedure summary XML Documentation for given AL Procedure.
     * @param alProcedure ALProcedure object.
     * @param idx Placeholder Index for Snippet.
     */
    public static GenerateProcedureDocString(alProcedure: ALProcedure, idx: number = -1): string {
        let docString: string = "/// ";
        docString += "<summary> \n";
        docString += "/// ${" + ((idx === -1) ? "__idx__" : idx) + ":" + alProcedure.Name + ".}\n";
        docString += "/// </summary>";

        alProcedure.XmlDocumentation = docString;

        return docString;
    }

    /**
     * Generate Parameter XML Documentation for given AL Parameter.
     * @param alParameter ALParameter object.
     * @param idx Placeholder Index for Snippet.
     */
    public static GenerateParameterDocString(alParameter: ALParameter, idx: number = -1): string {
        let docString: string = "/// ";
        docString += "<param name=\"" + alParameter.Name + "\">";
        docString += "${" + ((idx === -1) ? "__idx__" : idx) + ":";
        if (alParameter.Temporary) {
            docString += "Temporary ";
        }
        if (alParameter.CallByReference) {
            docString += "VAR ";
        }
        docString += alParameter.Type;
        if ((alParameter.Subtype !== "") && (alParameter.Subtype !== undefined)) {
            docString += " " + alParameter.Subtype;
        }
        docString += ".}";
        docString += "</param>";

        alParameter.XmlDocumentation = docString;

        return docString;
    }

    /**
     * Generate Return Value XML Documentation for given Return.
     * @param alProcedureReturn Return Type object.
     * @param idx Placeholder Index for Snippet.
     */
    public static GenerateProcedureReturnDocString(alProcedureReturn: ALProcedureReturn, idx: number = -1): string {
        let docString: string = "/// ";
        docString += "<returns>";
        docString += "${" + ((idx === -1) ? "__idx__" : idx) + ":";
        if (alProcedureReturn.Name !== "") {
            docString += "Return variable " + alProcedureReturn.Name;
        } else {
            docString += "Return value";
        }
        docString += " of type " + alProcedureReturn.Type;
        docString += ".}";
        docString += "</returns>";

        alProcedureReturn.XmlDocumentation = docString;

        return docString;
    }
    
    /**
     * Converts XML Documentation to JSON object.
     * @param xmlDocumentation XML Documentation.
     */
    public static GetJsonFromXmlDocumentation(xmlDocumentation: string): any {        
        // transform xml to json
        var parser = require('fast-xml-parser');
        var options = {
            attributeNamePrefix : "",
            attrNodeName: "attr",
            textNodeName : "value",
            ignoreAttributes : false,
            ignoreNameSpace : true,
            parseAttributeValue : true
        };
        try {
            var jsonDocumentation = parser.parse(`<?xml version="1.0."?><root>${xmlDocumentation}</root>`, options, true);
        } catch(ex) {
            return;
        }

        return jsonDocumentation.root;
    }

    /**
     * Get XML Documentation node from XML Documentation.
     * @param xmlDocumentation XML Documentation.
     * @param xmlNode Requested XML node.
     * @param attrName Requested attribute (optional).
     * @param attrValue Requested attribute value (optional).
     */
    public static GetXmlDocumentationNode(xmlDocumentation: string, xmlNode: string, attrName: string = "", attrValue: string = ""): string {
        let isTag: boolean = false;
        let docNode: string = "";
        xmlDocumentation.split("\n").forEach(line => {
            if (attrName !== "") {
                if (line.includes(`<${xmlNode} ${attrName}="${attrValue}">`)) {
                    isTag = true;
                }
            } else {
                if (line.includes(`<${xmlNode}>`)) {
                    isTag = true;
                }
            }
            if (isTag) {
                if (docNode !== "") {
                    docNode = `${docNode}\n`;
                }
                docNode = `${docNode}${line}`;
            }
            if (line.includes(`</${xmlNode}>`)) {
                isTag = false;
            }
        });

        return docNode;
    }

    /**
     * Get last XML Documentation line no.
     * @param editor Current instance of TextEditor object.
     * @param startingLineNo Line No. to start search from (optional).
     */
    public static GetLastXmlDocumentationLineNo(editor: TextEditor, startingLineNo: number = -1): number { 
        if (startingLineNo === -1) {
            let vsCodeApi = new VSCodeApi(editor); 
            startingLineNo = vsCodeApi.GetActivePosition().line;
        }

        let alCode = editor.document.getText().replace(/\r/g,'').split('\n');    
        for (let lineNo = startingLineNo - 1; lineNo > 0; lineNo--) {
            let line = alCode[lineNo];
            if (line.includes('///')) {
                return lineNo + 1;
            }
        }
        return -1;
    }

    /**
     * Get start position in current line.
     * @param document TextDocument object.
     * @param lineNo Current Line No.
     */
    public static GetLineStartPosition(document: TextDocument, lineNo: number): number {
        let alCode = document.getText().replace(/\r/g,'').split('\n');
        return ((alCode[lineNo].length) - (alCode[lineNo].trim().length));
    }
}
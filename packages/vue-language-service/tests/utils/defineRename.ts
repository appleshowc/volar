import type * as vscode from 'vscode-languageserver-protocol';
import { describe, expect, it } from 'vitest';
import * as path from 'upath';
import { tester } from './createTester';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as shared from '@volar/shared';

const volarRoot = path.resolve(__dirname, '../../../..');

export function defineRename(action: {
	fileName: string,
	position: vscode.Position,
	newName: string,
	length: number,
	resultFileNums?: number,
}, expectedResult: Record<string, string>) {

	const fileName = action.fileName;
	const uri = shared.fsPathToUri(fileName);

	describe(`renaming ${path.basename(fileName)}`, () => {
		for (let i = 0; i < action.length; i++) {
			const location = `${path.relative(volarRoot, fileName)}:${action.position.line + 1}:${action.position.character + i + 1}`;
			it(`rename ${location} => ${action.newName}`, async () => {
				const result = await tester.languageService.doRename(
					uri,
					{ line: action.position.line, character: action.position.character + i },
					action.newName,
				);

				expect(!!result?.changes).toEqual(true);
				if (!result?.changes) return;

				expect(Object.keys(result.changes).length).toEqual(action.resultFileNums ?? Object.keys(expectedResult).length);

				for (const fileName in expectedResult) {

					const textEdits = result?.changes?.[shared.fsPathToUri(fileName)];
					expect(!!textEdits).toEqual(true);
					if (!textEdits) continue;

					const renameScript = tester.host.getScriptSnapshot(fileName);
					expect(!!renameScript).toEqual(true);
					if (!renameScript) continue;

					const renameScriptText = renameScript.getText(0, renameScript.getLength());
					const renameScriptResult = TextDocument.applyEdits(TextDocument.create('', '', 0, renameScriptText), textEdits);
					expect(normalizedText(renameScriptResult)).toEqual(normalizedText(expectedResult[fileName]));

				}
			});
		}
	});
}

// avoid new line character different
function normalizedText(text: string) {
	return text.split('\n').map(line => line.trim()).join('\n');
}
